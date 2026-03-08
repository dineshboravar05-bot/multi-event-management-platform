require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/database');

const authRoutes = require('./routes/auth').router;
const eventRoutes = require('./routes/events');
const checklistRoutes = require('./routes/checklists');
const timelineRoutes = require('./routes/timelines');
const managementRoutes = require('./routes/management');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/timelines', timelineRoutes);
app.use('/api/management', managementRoutes);

// Serve static frontend files from 'dist'
app.use(express.static(path.join(__dirname, 'dist')));

// Additional Checklists & Timeline Endpoints below

// Database connection test (Wait for it on start)
pool.getConnection()
    .then(connection => {
        console.log('Database connected on startup inside server');
        connection.release();
    })
    .catch(err => {
        console.error('Database connection failed:', err);
    });

// Default fallback to index
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
