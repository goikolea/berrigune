const express = require('express');
const app = express();
const http = require('http').createServer(app);
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken'); 
const db = require('./server/database/db');

app.use(express.static('public'));
app.use(bodyParser.json());

// --- CONFIGURACIÓN DE SEGURIDAD ---
const JWT_SECRET = "CLAVE_SECRETA_CENTRO_FP_2025"; // Cambiar en producción
const DOMINIO_PERMITIDO = "atxuri.net"; // CAMBIA ESTO por el dominio de tu centro (ej: fpcentro.es)
const CODIGO_ACCESO = "1234"; // La contraseña maestra que darás a los profesores

// Middleware: Barrera de seguridad
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

    if (!token) return res.sendStatus(401); // ¿Quién eres?

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Tu carnet es falso o caducó
        req.user = user;
        next(); // Pasa, amigo
    });
};


// --- API PÚBLICA (Login) ---

app.post('/api/login', (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) return res.status(400).json({ error: 'Faltan datos' });
    
    // 1. Validar Dominio
    const domain = email.split('@')[1];
    if (domain !== DOMINIO_PERMITIDO) {
        return res.status(403).json({ error: `Acceso restringido a cuentas @${DOMINIO_PERMITIDO}` });
    }

    // 2. Validar Código Maestro
    if (code !== CODIGO_ACCESO) {
        return res.status(403).json({ error: 'Código de acceso incorrecto' });
    }

    // 3. Buscar o Crear Usuario
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!user) {
        const id = uuidv4();
        const name = email.split('@')[0]; // Usamos la parte antes del @ como nombre inicial
        db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run(id, email, name);
        user = { id, email, name };
    }

    // 4. Emitir Token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ user, token });
});


// --- API PRIVADA (Requiere Token) ---

// 1. Obtener Tipos (Formas)
app.get('/api/signal-types', authenticateToken, (req, res) => {
    const types = db.prepare('SELECT * FROM signal_types').all();
    res.json(types);
});

// 2. Obtener Categorías (Colores)
app.get('/api/categories', authenticateToken, (req, res) => {
    const categories = db.prepare('SELECT * FROM categories').all();
    res.json(categories);
});

// 3. Obtener Nodos (Hacemos doble JOIN para sacar forma y color)
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

// 4. Crear Nodo
app.post('/api/nodes', authenticateToken, (req, res) => {
    // Recibimos signal_type_id (QUÉ ES) Y category_id (DE QUÉ ÁREA ES)
    const { signal_type_id, category_id, x, y, title, description, link, is_new_category, new_category_data } = req.body;
    const user_id = req.user.id;
    
    if (!title) return res.status(400).json({ error: 'Falta título' });

    let finalCategoryId = category_id;

    try {
        // Lógica de Nueva Categoría (Solo crea Color y Nombre, la forma ya no va aquí)
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
        
        // Devolvemos nodo completo haciendo los joins para tener los datos visuales
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

const PORT = 3000;
http.listen(PORT, () => {
    console.log(`🚀 Servidor Seguro listo en http://localhost:${PORT}`);
});