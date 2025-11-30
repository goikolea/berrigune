require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken'); 
const bcrypt = require('bcryptjs'); 

// --- SECURITY IMPORTS ---
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const db = require('./server/database/db');

// --- CONFIGURACIÓN ---
const DOMAIN = process.env.ALLOWED_DOMAIN || 'local.test';
const JWT_SECRET = process.env.JWT_SECRET;
const CODIGO_CENTRO = process.env.CODIGO_CENTRO || "1234"; 

// --- SECURITY CHECKS ---
if (!JWT_SECRET) {
    console.error("🚨 CRITICAL ERROR: JWT_SECRET is missing in .env");
    console.error("   Please add: JWT_SECRET=super_long_random_string");
    process.exit(1);
}

// --- PROXY TRUST ---
app.set('trust proxy', 1); 

// --- 1. HELMET (HTTP HEADERS) ---
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      // UPDATE: Added 'unsafe-eval' to allow PixiJS to compile shaders
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "cdnjs.cloudflare.com"], 
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"], 
      connectSrc: ["'self'"], 
    },
  })
);

// --- 2. RATE LIMITING ---

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, 
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiados intentos de acceso. Por favor espera 15 minutos." }
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(express.static('public'));
app.use(bodyParser.json());

console.log(`🚀 Configuración cargada: Dominio @${DOMAIN}`);

// --- HELPER FUNCTIONS ---
const sanitizeUser = (user) => {
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
};

// --- MIDDLEWARES ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
    if (!token) return res.sendStatus(401); 

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); 
        req.user = user;
        next(); 
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    next();
};

// --- APLICAR LIMITADORES ---
app.use('/api/check-user', authLimiter);
app.use('/api/activate', authLimiter);
app.use('/api/login', authLimiter);
app.use('/api', apiLimiter);


// 0. Configuración Pública
app.get('/api/public-config', (req, res) => {
    res.json({ domain: DOMAIN });
});

// 1. VERIFICAR ESTADO
app.post('/api/check-user', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Falta email" });

    const user = db.prepare('SELECT id, password FROM users WHERE email = ?').get(email);
    if (!user) return res.json({ status: 'unknown' });
    if (!user.password) return res.json({ status: 'pending' });
    return res.json({ status: 'active' });
});

// --- API PÚBLICA ---

app.post('/api/activate', (req, res) => {
    const { email, centerCode, newPassword } = req.body;

    if (centerCode !== CODIGO_CENTRO) {
        return setTimeout(() => res.status(403).json({ error: 'Código de Centro incorrecto' }), 500);
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!user) return res.status(404).json({ error: 'Email no autorizado.' });
    if (user.password) return res.status(400).json({ error: 'Cuenta ya activa.' });

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);

    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, user.id);

    const updatedUser = { ...user, password: hash }; 
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    
    res.json({ user: sanitizeUser(updatedUser), token, message: "Cuenta activada" });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Faltan datos' });
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!user) return res.status(403).json({ error: 'Credenciales inválidas' });
    if (!user.password) return res.status(403).json({ error: 'Cuenta pendiente de activar.' });

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) return res.status(403).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    
    res.json({ user: sanitizeUser(user), token });
});


// --- API PRIVADA ---

app.get('/api/signal-types', authenticateToken, (req, res) => {
    res.json(db.prepare('SELECT * FROM signal_types').all());
});

app.get('/api/categories', authenticateToken, (req, res) => {
    res.json(db.prepare('SELECT * FROM categories').all());
});

app.get('/api/nodes', authenticateToken, (req, res) => {
    const nodes = db.prepare(`
        SELECT nodes.*, 
               categories.color as cat_color, categories.name as cat_name,
               signal_types.shape as type_shape, signal_types.name as type_name
        FROM nodes 
        LEFT JOIN categories ON nodes.category_id = categories.id
        LEFT JOIN signal_types ON nodes.signal_type_id = signal_types.id
    `).all();
    res.json(nodes);
});

app.post('/api/nodes', authenticateToken, (req, res) => {
    const { signal_type_id, category_id, x, y, title, description, link, is_new_category, new_category_data } = req.body;
    
    if (!title || title.length > 100) return res.status(400).json({ error: 'Título inválido (Max 100 chars)' });
    if (typeof x !== 'number' || typeof y !== 'number') return res.status(400).json({ error: 'Coordenadas inválidas' });

    let finalCategoryId = category_id;

    try {
        if (is_new_category && new_category_data) {
            const { name, color } = new_category_data;
            const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
            
            const stmt = db.prepare('INSERT INTO categories (name, color, slug) VALUES (?, ?, ?)');
            const info = stmt.run(name, color, slug);
            finalCategoryId = info.lastInsertRowid;
        }

        const id = uuidv4();
        const insertNode = db.prepare(`
            INSERT INTO nodes (id, user_id, signal_type_id, category_id, x, y, title, description, link)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        insertNode.run(id, req.user.id, signal_type_id, finalCategoryId, x, y, title, description || '', link || '');
        
        const newNode = db.prepare(`
            SELECT nodes.*, 
                   categories.color as cat_color, categories.name as cat_name,
                   signal_types.shape as type_shape, signal_types.name as type_name
            FROM nodes 
            LEFT JOIN categories ON nodes.category_id = categories.id
            LEFT JOIN signal_types ON nodes.signal_type_id = signal_types.id
            WHERE nodes.id = ?
        `).get(id);

        res.json(newNode);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al guardar' });
    }
});

app.put('/api/nodes/:id/position', authenticateToken, (req, res) => {
    const { x, y } = req.body;
    const nodeId = req.params.id;
    
    if (typeof x !== 'number' || typeof y !== 'number') return res.status(400).json({ error: 'Coordenadas inválidas' });

    const node = db.prepare('SELECT user_id FROM nodes WHERE id = ?').get(nodeId);
    if (!node) return res.status(404).json({ error: 'Nodo no encontrado' });
    if (node.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'No tienes permiso' });
    }

    db.prepare('UPDATE nodes SET x = ?, y = ? WHERE id = ?').run(x, y, nodeId);
    res.json({ success: true });
});

// --- CONEXIONES ---

app.post('/api/connections', authenticateToken, (req, res) => {
    const { source_node_id, target_node_id, description } = req.body;
    if (!source_node_id || !target_node_id) return res.status(400).json({ error: 'Faltan nodos' });

    const id = uuidv4();
    try {
        db.prepare(`
            INSERT INTO connections (id, user_id, source_node_id, target_node_id, description)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, req.user.id, source_node_id, target_node_id, description || '');
        
        const newConn = {
            id, user_id: req.user.id, source_node_id, target_node_id, description,
            created_at: new Date().toISOString()
        };
        res.json(newConn);
    } catch (err) {
        res.status(500).json({ error: 'Error guardando conexión' });
    }
});

app.get('/api/connections', authenticateToken, (req, res) => {
    res.json(db.prepare('SELECT * FROM connections').all());
});

app.delete('/api/connections/:id', authenticateToken, (req, res) => {
    const connId = req.params.id;
    const conn = db.prepare('SELECT user_id FROM connections WHERE id = ?').get(connId);
    if (!conn) return res.status(404).json({ error: 'Conexión no encontrada' });
    
    if (conn.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'No tienes permiso' });
    }

    db.prepare('DELETE FROM connections WHERE id = ?').run(connId);
    res.json({ success: true });
});

// --- GAMIFICACIÓN ---

app.post('/api/visit/:nodeId', authenticateToken, (req, res) => {
    try {
        db.prepare('INSERT OR IGNORE INTO visits (user_id, node_id) VALUES (?, ?)').run(req.user.id, req.params.nodeId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/user-stats', authenticateToken, (req, res) => {
    try {
        const createdCount = db.prepare('SELECT count(*) as c FROM nodes WHERE user_id = ?').get(req.user.id).c;
        const connCount = db.prepare('SELECT count(*) as c FROM connections WHERE user_id = ?').get(req.user.id).c;
        res.json({ email: req.user.email, nodes_created: createdCount, connections_created: connCount });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/announcement', authenticateToken, (req, res) => {
    const announcement = db.prepare('SELECT message FROM announcements WHERE id = 1').get();
    res.json({ message: announcement ? announcement.message : "" });
});


// --- API ADMIN ---

app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    const users = db.prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC').all();
    const usersWithStatus = users.map(u => {
        const checkPass = db.prepare('SELECT password FROM users WHERE id = ?').get(u.id);
        return { 
            ...u, 
            password: checkPass && checkPass.password ? 'HASHED' : null 
        };
    });
    res.json(usersWithStatus);
});

app.post('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    const { emails } = req.body;
    if (!emails) return res.status(400).json({ error: "Lista vacía" });

    const emailList = emails.split(',').map(e => e.trim()).filter(e => e);
    const stmt = db.prepare('INSERT OR IGNORE INTO users (id, email, name, role, password) VALUES (?, ?, ?, ?, NULL)');
    
    let count = 0;
    emailList.forEach(email => {
        if(email.endsWith('@' + DOMAIN)) { 
            const name = email.split('@')[0];
            stmt.run(uuidv4(), email, name, 'user');
            count++;
        }
    });
    res.json({ message: `${count} usuarios añadidos a lista blanca.` });
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ error: "No puedes borrarte a ti mismo" });
    
    db.prepare('DELETE FROM connections WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM nodes WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
});

app.post('/api/admin/users/reset/:id', authenticateToken, requireAdmin, (req, res) => {
    db.prepare('UPDATE users SET password = NULL WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

app.post('/api/admin/announcement', authenticateToken, requireAdmin, (req, res) => {
    const { message } = req.body;
    if (message.includes('<script>')) return res.status(400).json({ error: "Contenido no permitido" });
    
    db.prepare('UPDATE announcements SET message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(message);
    res.json({ success: true });
});

app.get('/api/admin/content', authenticateToken, requireAdmin, (req, res) => {
    const nodes = db.prepare('SELECT id, title, description, link, user_id FROM nodes').all();
    const connections = db.prepare('SELECT id, description, user_id FROM connections').all();
    res.json({ nodes, connections });
});

app.delete('/api/admin/nodes/:id', authenticateToken, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM connections WHERE source_node_id = ? OR target_node_id = ?').run(req.params.id, req.params.id);
    db.prepare('DELETE FROM nodes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

app.delete('/api/admin/connections/:id', authenticateToken, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM connections WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

app.put('/api/admin/nodes/:id', authenticateToken, requireAdmin, (req, res) => {
    const { title, description, link } = req.body;
    const { id } = req.params;
    
    try {
        const stmt = db.prepare('UPDATE nodes SET title = ?, description = ?, link = ? WHERE id = ?');
        const info = stmt.run(title, description, link, id);
        if (info.changes === 0) return res.status(404).json({ error: "Nodo no encontrado" });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/admin/connections/:id', authenticateToken, requireAdmin, (req, res) => {
    const { description } = req.body;
    const { id } = req.params;
    try {
        const stmt = db.prepare('UPDATE connections SET description = ? WHERE id = ?');
        const info = stmt.run(description, id);
        if (info.changes === 0) return res.status(404).json({ error: "Conexión no encontrada" });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = 3000;
http.listen(PORT, () => {
    console.log(`🚀 Servidor Seguro listo en http://localhost:${PORT}`);
});