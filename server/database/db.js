require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs'); 
const fs = require('fs'); // Import FS to check directory existence

// --- CONFIGURACIÓN ---
const DOMAIN = process.env.ALLOWED_DOMAIN || 'local.test';
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'admin1234';

// --- DATABASE PATH LOGIC ---
let dbPath;

if (process.env.NODE_ENV === 'production') {
    // PRODUCTION: Use the separate data volume folder
    // This maps to ./docker-data on your host machine
    const dataDir = path.join(__dirname, '../../data');
    
    // Ensure the directory exists (Docker usually handles this, but this is a safety check)
    if (!fs.existsSync(dataDir)){
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    dbPath = path.join(dataDir, 'campus.sqlite');
    console.log("CDC Mode: PRODUCTION. DB Path:", dbPath);
} else {
    // TESTING/LOCAL: Keep it in the current folder (server/database)
    dbPath = path.join(__dirname, 'campus.sqlite');
    console.log("CDC Mode: TESTING. DB Path:", dbPath);
}

const db = new Database(dbPath);