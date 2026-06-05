const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const db = require('./database');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'eagle_sports_super_secret_key_2026';

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from the public directory (for security)
app.use(express.static(path.join(__dirname, 'public')));

// Multer config for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'public', 'assets'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'jersey-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Rate limiting for login to prevent brute-force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login requests per window
    message: { error: 'Too many login attempts, please try again later' }
});

// --- AUTHENTICATION ROUTES ---
app.post('/api/login', loginLimiter, (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    });
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
};

// --- CATALOG ROUTES ---
// Get all jerseys (Public)
app.get('/api/jerseys', (req, res) => {
    db.all('SELECT * FROM jerseys', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add a new jersey (Protected)
app.post('/api/jerseys', authenticateToken, upload.single('image'), (req, res) => {
    const { name, category } = req.body;

    if (!name || !category || !req.file) {
        return res.status(400).json({ error: 'Name, category, and image are required' });
    }

    const imagePath = 'assets/' + req.file.filename;

    db.run('INSERT INTO jerseys (name, category, image) VALUES (?, ?, ?)', [name, category, imagePath], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            id: this.lastID,
            name,
            category,
            image: imagePath
        });
    });
});

// Delete a jersey (Protected)
app.delete('/api/jerseys/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM jerseys WHERE id = ?', id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Jersey not found' });
        res.json({ message: 'Deleted successfully' });
    });
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
