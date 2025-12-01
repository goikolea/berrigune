require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs'); 
const fs = require('fs');

// --- CONFIGURATION ---
const DOMAIN = process.env.ALLOWED_DOMAIN || 'local.test';
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'admin1234';

// --- DATABASE PATH LOGIC ---
let dbPath;

if (process.env.NODE_ENV === 'production') {
    // PRODUCTION: Use the separate data volume folder (/app/data)
    const dataDir = path.join(__dirname, '../../data');
    
    // Ensure directory exists
    if (!fs.existsSync(dataDir)){
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    dbPath = path.join(dataDir, 'campus.sqlite');
    console.log("CDC Mode: PRODUCTION. DB Path:", dbPath);
} else {
    // TESTING/LOCAL: Keep it in the server/database folder
    dbPath = path.join(__dirname, 'campus.sqlite');
    console.log("CDC Mode: TESTING. DB Path:", dbPath);
}

// Initialize DB connection
const db = new Database(dbPath);

// --- INITIALIZATION FUNCTION ---
const initDB = () => {
    console.log("🔄 Inicializando base de datos...");

    // 1. Users
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            name TEXT,
            department TEXT,
            role TEXT DEFAULT 'user',
            password TEXT, 
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 2. Signal Types
    db.exec(`
        CREATE TABLE IF NOT EXISTS signal_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            shape TEXT,
            slug TEXT UNIQUE
        )
    `);

    // 3. Categories
    db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            color TEXT,
            slug TEXT UNIQUE
        )
    `);

    // 4. Nodes
    db.exec(`
        CREATE TABLE IF NOT EXISTS nodes (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            signal_type_id INTEGER,
            category_id INTEGER,
            x REAL,
            y REAL,
            title TEXT,
            description TEXT,
            link TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(signal_type_id) REFERENCES signal_types(id),
            FOREIGN KEY(category_id) REFERENCES categories(id)
        )
    `);

    // 5. Connections
    db.exec(`
        CREATE TABLE IF NOT EXISTS connections (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            source_node_id TEXT,
            target_node_id TEXT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(source_node_id) REFERENCES nodes(id),
            FOREIGN KEY(target_node_id) REFERENCES nodes(id)
        )
    `);

    // 6. Visits
    db.exec(`
        CREATE TABLE IF NOT EXISTS visits (
            user_id TEXT,
            node_id TEXT,
            visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, node_id),
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(node_id) REFERENCES nodes(id)
        )
    `);

    // 7. Active Challenge
    db.exec(`
        CREATE TABLE IF NOT EXISTS active_challenge (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            description TEXT,
            target_count INTEGER,
            cat_source_slug TEXT,
            cat_target_slug TEXT
        )
    `);

    // 8. Announcements
    db.exec(`
        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            message TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // --- SEEDS ---

    // A. Seed Types
    const stmtTypes = db.prepare('SELECT count(*) as count FROM signal_types');
    if (stmtTypes.get().count === 0) {
        const insertType = db.prepare('INSERT INTO signal_types (name, shape, slug) VALUES (?, ?, ?)');
        insertType.run('Idea', 'diamond', 'idea');
        insertType.run('Señal/Noticia', 'hexagon', 'signal');
        insertType.run('Pregunta/Duda', 'circle', 'question');
        insertType.run('Reto/Problema', 'triangle', 'challenge');
        insertType.run('Proyecto', 'square', 'project');
    }

    // B. Seed Categories
    const stmtCats = db.prepare('SELECT count(*) as count FROM categories');
    if (stmtCats.get().count === 0) {
        const insertCat = db.prepare('INSERT INTO categories (name, color, slug) VALUES (?, ?, ?)');
        insertCat.run('Elektronika', '#4A90E2', 'innovacion');
        insertCat.run('Learning factory', '#9013FE', 'informatica');
        insertCat.run('Jasangarritasuna', '#F5A623', 'electronica');
        insertCat.run('Ekintzailetza', '#50E3C2', 'sostenibilidad');
    }

    // C. Seed Announcement & Challenge
    db.prepare('INSERT OR IGNORE INTO announcements (id, message) VALUES (1, ?)').run("📢 Reto de la semana: ¡Conectad ideas!");
    db.prepare('INSERT OR IGNORE INTO active_challenge (id, description, target_count, cat_source_slug, cat_target_slug) VALUES (1, ?, 5, ?, ?)').run('Conecta Innovación con Informática', 'innovacion', 'informatica');

    // E. SEED MASTER USER
    const masterEmail = `master@${DOMAIN}`;
    const stmtUser = db.prepare('SELECT * FROM users WHERE email = ?');
    
    if (!stmtUser.get(masterEmail)) {
        console.log(`👑 Sembrando Usuario Master (${masterEmail})...`);
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(MASTER_PASSWORD, salt);

        db.prepare('INSERT INTO users (id, email, name, role, password) VALUES (?, ?, ?, ?, ?)')
          .run(uuidv4(), masterEmail, 'Master', 'admin', hash);
    }
};

// Run Init
initDB();

// EXPORT THE DB OBJECT (This was missing!)
module.exports = db;