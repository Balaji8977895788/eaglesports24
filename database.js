const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (!err) {
        // Enable WAL mode for high concurrency and performance
        db.run('PRAGMA journal_mode=WAL;');
    }
});

db.serialize(() => {
    // Create Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);

    // Create Jerseys table
    db.run(`CREATE TABLE IF NOT EXISTS jerseys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        image TEXT NOT NULL
    )`);

    // Index for fast category lookups (optimization)
    db.run(`CREATE INDEX IF NOT EXISTS idx_category ON jerseys(category)`);

    // Seed default admin user if none exists
    db.get('SELECT * FROM users WHERE email = ?', ['admin@eaglesports.com'], (err, row) => {
        if (!row) {
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync('admin123', salt);
            db.run('INSERT INTO users (email, password) VALUES (?, ?)', ['admin@eaglesports.com', hash]);
            console.log('Default admin user created: admin@eaglesports.com / admin123');
        }
    });

    // Seed default jerseys if table is empty
    db.get('SELECT COUNT(*) as count FROM jerseys', (err, row) => {
        if (row && row.count === 0) {
            const defaultCatalog = [
                { name: 'Pro Volley Jersey', category: 'Volleyball', image: 'assets/volleyball_jersey.png' },
                { name: 'Hoops Elite Jersey', category: 'Basketball', image: 'assets/basketball_jersey.png' },
                { name: 'Raider Pro Jersey', category: 'Kabaddi', image: 'assets/kabaddi_jersey.png' },
                { name: 'Cricket Pro Jersey', category: 'Cricket Jerseys', image: 'assets/cricket_jersey.png' },
                { name: 'Festive Holi Edition', category: 'Festival Design', image: 'assets/festival_jersey.png' },
                { name: 'Eagle Gold Special', category: 'Special Jerseys', image: 'assets/special_jersey.png' }
            ];
            
            const stmt = db.prepare('INSERT INTO jerseys (name, category, image) VALUES (?, ?, ?)');
            defaultCatalog.forEach(item => {
                stmt.run(item.name, item.category, item.image);
            });
            stmt.finalize();
            console.log('Default catalog seeded.');
        }
    });
});

module.exports = db;
