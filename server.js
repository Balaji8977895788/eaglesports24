const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const supabase = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'eagle_sports_super_secret_key_2026';

// Trust Render's reverse proxy so rate limiting uses the correct client IP
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from the public directory (for security)
app.use(express.static(path.join(__dirname, 'public')));

// Multer config for image uploads: use memory storage for Supabase upload
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max file size
});

// Rate limiting for login to prevent brute-force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login requests per window
    message: { error: 'Too many login attempts, please try again later' }
});

// --- AUTHENTICATION ROUTES ---
app.post('/api/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Database error: ' + (err.message || JSON.stringify(err)) });
    }
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
app.get('/api/jerseys', async (req, res) => {
    try {
        const { data: rows, error } = await supabase
            .from('jerseys')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        res.json(rows);
    } catch (err) {
        console.error('Error fetching jerseys:', err);
        res.status(500).json({ error: err.message });
    }
});

// Add a new jersey (Protected)
app.post('/api/jerseys', authenticateToken, upload.single('image'), async (req, res) => {
    const { name, category } = req.body;

    if (!name || !category || !req.file) {
        return res.status(400).json({ error: 'Name, category, and image are required' });
    }

    try {
        // 1. Upload to Supabase Storage
        const fileExt = path.extname(req.file.originalname);
        const fileName = `jersey-${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('jerseys')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('jerseys')
            .getPublicUrl(fileName);

        // 3. Insert into Database
        const { data: insertData, error: insertError } = await supabase
            .from('jerseys')
            .insert([{ name, category, image: publicUrl }])
            .select()
            .single();

        if (insertError) throw insertError;

        res.json(insertData);
    } catch (err) {
        console.error('Error adding jersey:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete a jersey (Protected)
app.delete('/api/jerseys/:id', authenticateToken, async (req, res) => {
    const id = req.params.id;

    try {
        // Fetch image URL first
        const { data: jersey, error: fetchError } = await supabase
            .from('jerseys')
            .select('image')
            .eq('id', id)
            .single();

        if (fetchError) {
            return res.status(404).json({ error: 'Jersey not found' });
        }

        // Delete from database
        const { error: deleteError } = await supabase
            .from('jerseys')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        // Delete from storage if it's a supabase URL
        if (jersey.image && jersey.image.includes('/storage/v1/object/public/jerseys/')) {
            const urlParts = jersey.image.split('/');
            const fileName = urlParts[urlParts.length - 1];
            
            if (fileName) {
                await supabase.storage.from('jerseys').remove([fileName]);
            }
        }

        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error('Error deleting jersey:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
