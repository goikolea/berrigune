const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'campus.sqlite');
const db = new Database(dbPath);

const initDB = () => {
    // 1. Usuarios
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            name TEXT,
            department TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 2. TIPOS DE SEÑAL (Define la FORMA) - Lista Fija/Estructural
    db.exec(`
        CREATE TABLE IF NOT EXISTS signal_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,   -- Ej: "Idea", "Reto"
            shape TEXT,  -- Ej: "diamond", "triangle"
            slug TEXT UNIQUE
        )
    `);

    // 3. CATEGORÍAS/ÁREAS (Define el COLOR) - Lista Dinámica
    db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,   -- Ej: "Informática", "IA"
            color TEXT,  -- Ej: "#FF0000"
            slug TEXT UNIQUE
        )
    `);

    // 4. Nodos (Ahora tienen FK a Tipo Y a Categoría)
    db.exec(`
        CREATE TABLE IF NOT EXISTS nodes (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            signal_type_id INTEGER, -- FK a Tipo (Forma)
            category_id INTEGER,    -- FK a Categoría (Color)
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

    // --- SEMILLAS (Datos Iniciales) ---

    // A. Sembrar Tipos (Formas) - Esto define el lenguaje visual del mapa
    const stmtTypes = db.prepare('SELECT count(*) as count FROM signal_types');
    if (stmtTypes.get().count === 0) {
        console.log("🌱 Sembrando Tipos de Señal...");
        const insertType = db.prepare('INSERT INTO signal_types (name, shape, slug) VALUES (?, ?, ?)');
        insertType.run('Idea', 'diamond', 'idea');           // Rombo
        insertType.run('Señal/Noticia', 'hexagon', 'signal'); // Hexágono
        insertType.run('Pregunta/Duda', 'circle', 'question');// Círculo
        insertType.run('Reto/Problema', 'triangle', 'challenge'); // Triángulo Invertido
        insertType.run('Proyecto', 'square', 'project');      // Cuadrado
    }

    // B. Sembrar Categorías (Colores por defecto)
    const stmtCats = db.prepare('SELECT count(*) as count FROM categories');
    if (stmtCats.get().count === 0) {
        console.log("🌱 Sembrando Categorías iniciales...");
        const insertCat = db.prepare('INSERT INTO categories (name, color, slug) VALUES (?, ?, ?)');
        insertCat.run('Elektronika', '#4A90E2', 'innovacion'); // Azul
        insertCat.run('Learning factory', '#9013FE', 'informatica');   // Violeta
        insertCat.run('Jasangarritasuna', '#F5A623', 'electronica');       // Naranja
        insertCat.run('Ekintzailetza', '#50E3C2', 'sostenibilidad'); // Verde Agua
    }
};

initDB();

module.exports = db;