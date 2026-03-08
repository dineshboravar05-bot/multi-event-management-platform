// Authentication Routes
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'eventflow_secret_key_2026';

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ============================================
// USER REGISTRATION
// ============================================
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, full_name } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email and password are required' });
        }

        // Check if user exists
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'User with this email or username already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert user
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
            [username, email, password_hash, full_name || username]
        );

        res.status(201).json({
            message: 'User registered successfully',
            user_id: result.insertId
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// ============================================
// USER LOGIN (Email/Username + Password)
// ============================================
router.post('/login/user', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Identifier and password are required' });
        }

        // Find user by email or username
        const [users] = await pool.query(
            'SELECT * FROM users WHERE (email = ? OR username = ?) AND is_active = TRUE',
            [identifier, identifier]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await pool.query(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, role: 'user' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: 'user'
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// ============================================
// ORGANIZER LOGIN (Token-based)
// ============================================
router.post('/login/organizer', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Organizer token is required' });
        }

        // Hash the incoming token to compare with stored hash
        const salt = await bcrypt.genSalt(10);
        const token_hash = await bcrypt.hash(token, salt);

        // For demo purposes, also check against the default token
        // In production, use proper token comparison
        const defaultToken = 'EVENTFLOW_ORG_2026_SECRET_TOKEN';
        const isDefaultMatch = token === defaultToken;

        // Find organizer token in database
        const [tokens] = await pool.query(
            'SELECT * FROM organizer_tokens WHERE is_active = TRUE AND (token_hash = ? OR expires_at IS NULL OR expires_at > NOW())',
            [token_hash]
        );

        let organizer = null;

        // Check if default token matches
        if (isDefaultMatch) {
            // Get the first active organizer from DB
            const [defaultOrg] = await pool.query(
                'SELECT * FROM organizer_tokens WHERE is_active = TRUE LIMIT 1'
            );
            if (defaultOrg.length > 0) {
                organizer = defaultOrg[0];
            }
        } else if (tokens.length > 0) {
            organizer = tokens[0];
        }

        if (!organizer) {
            return res.status(401).json({ error: 'Invalid or expiredorganizer token' });
        }

        // Update last used
        await pool.query(
            'UPDATE organizer_tokens SET last_used = NOW() WHERE id = ?',
            [organizer.id]
        );

        // Generate JWT
        const jwtToken = jwt.sign(
            { id: organizer.id, role: 'organizer', label: organizer.description },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Organizer login successful',
            token: jwtToken,
            organizer: {
                id: organizer.id,
                description: organizer.description,
                role: 'organizer'
            }
        });

    } catch (error) {
        console.error('Organizer login error:', error);
        res.status(500).json({ error: 'Server error during organizer login' });
    }
});

// ============================================
// GET CURRENT USER
// ============================================
router.get('/me', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'user') {
            const [users] = await pool.query(
                'SELECT id, username, email, full_name, phone, avatar_url, created_at, last_login FROM users WHERE id = ?',
                [req.user.id]
            );

            if (users.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({ user: users[0] });
        } else if (req.user.role === 'organizer') {
            res.json({
                organizer: {
                    id: req.user.id,
                    description: req.user.label,
                    role: 'organizer'
                }
            });
        }
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// LOGOUT (Client-side token removal)
// ============================================
router.post('/logout', authenticateToken, (req, res) => {
    // In a production app, you might want to blacklist the token
    res.json({ message: 'Logged out successfully' });
});

module.exports = { router, authenticateToken };
