const express = require('express');
const app = express();
const http = require('http').createServer(app);
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken'); 
const db = require('./server/database/db');

app.use(express.static('public'));
app.use(bodyParser.json());

const JWT_SECRET = "CLAVE_SECRETA_CENTRO_FP_2025"; 
const DOMINIO_PERMITIDO = "atxuri.net"; 
const CODIGO_ACCESO = "1234"; 

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

// --- API PÚBLICA ---

app.post('/api/login', (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Faltan datos' });
    
    const domain = email.split('@')[1];
    if (domain !== DOMINIO_PERMITIDO) {
        return res.status(403).json({ error: `Acceso restringido a cuentas @${DOMINIO_PERMITIDO}` });
    }

    if (code !== CODIGO_ACCESO) {
        return res.status(403).json({ error: 'Código incorrecto' });
    }

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
        const id = uuidv4();
        const name = email.split('@')[0]; 
        db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run(id, email, name);
        user = { id, email, name };
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user, token });
});

// --- API PRIVADA ---

app.get('/api/signal-types', authenticateToken, (req, res) => {
    const types = db.prepare('SELECT * FROM signal_types').all();
    res.json(types);
});

app.get('/api/categories', authenticateToken, (req, res) => {
    const categories = db.prepare('SELECT * FROM categories').all();
    res.json(categories);
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
    const user_id = req.user.id;
    
    if (!title) return res.status(400).json({ error: 'Falta título' });

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
        
        insertNode.run(id, user_id, signal_type_id, finalCategoryId, x, y, title, description || '', link || '');
        
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

// CONEXIONES

app.post('/api/connections', authenticateToken, (req, res) => {
    const { source_node_id, target_node_id, description } = req.body;
    const user_id = req.user.id;

    if (!source_node_id || !target_node_id) return res.status(400).json({ error: 'Faltan nodos' });

    const id = uuidv4();
    try {
        const stmt = db.prepare(`
            INSERT INTO connections (id, user_id, source_node_id, target_node_id, description)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(id, user_id, source_node_id, target_node_id, description || '');
        
        // --- CAMBIO: Devolver el objeto completo, especialmente el user_id ---
        const newConn = {
            id, 
            user_id, 
            source_node_id, 
            target_node_id, 
            description,
            created_at: new Date().toISOString()
        };
        
        res.json(newConn);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error guardando conexión' });
    }
});

app.get('/api/connections', authenticateToken, (req, res) => {
    // Hacemos JOIN para traer nombres de los nodos (opcional, pero útil para debug)
    const conns = db.prepare('SELECT * FROM connections').all();
    res.json(conns);
});

// NUEVO: Borrar conexión
app.delete('/api/connections/:id', authenticateToken, (req, res) => {
    const connId = req.params.id;
    const userId = req.user.id;

    const conn = db.prepare('SELECT user_id FROM connections WHERE id = ?').get(connId);
    if (!conn) return res.status(404).json({ error: 'Conexión no encontrada' });
    
    // Solo el dueño puede borrar
    if (conn.user_id !== userId) return res.status(403).json({ error: 'No tienes permiso' });

    db.prepare('DELETE FROM connections WHERE id = ?').run(connId);
    res.json({ success: true });
});

app.put('/api/nodes/:id/position', authenticateToken, (req, res) => {
    const { x, y } = req.body;
    const nodeId = req.params.id;
    const userId = req.user.id;

    const node = db.prepare('SELECT user_id FROM nodes WHERE id = ?').get(nodeId);
    if (!node) return res.status(404).json({ error: 'Nodo no encontrado' });
    if (node.user_id !== userId) return res.status(403).json({ error: 'No tienes permiso' });

    db.prepare('UPDATE nodes SET x = ?, y = ? WHERE id = ?').run(x, y, nodeId);
    res.json({ success: true });
});

// Obtener estadísticas del usuario para Badges
app.get('/api/user-stats', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const email = req.user.email; // El email viene en el token decodificado

    try {
        const createdCount = db.prepare('SELECT count(*) as c FROM nodes WHERE user_id = ?').get(userId).c;
        const connCount = db.prepare('SELECT count(*) as c FROM connections WHERE user_id = ?').get(userId).c;

        res.json({
            email: email,
            nodes_created: createdCount,
            connections_created: connCount
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Obtener Anuncio Global
app.get('/api/announcement', authenticateToken, (req, res) => {
    try {
        const announcement = db.prepare('SELECT message FROM announcements WHERE id = 1').get();
        res.json({ message: announcement ? announcement.message : "" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = 3000;
http.listen(PORT, () => {
    console.log(`🚀 Servidor Seguro listo en http://localhost:${PORT}`);
});