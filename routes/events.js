// Events API Routes
const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// ============================================
// GET ALL EVENTS (Public - Event Catalog)
// ============================================
router.get('/', async (req, res) => {
    try {
        const { category, search, status = 'published' } = req.query;

        let query = `
            SELECT e.*, 
            (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) as registered_count,
            (SELECT MIN(t.price) FROM tickets t WHERE t.event_id = e.id) as min_price
            FROM events e
            WHERE e.status = ?
        `;

        const params = [status];

        if (category && category !== 'all') {
            query += ' AND e.category = ?';
            params.push(category);
        }

        if (search) {
            query += ' AND (e.title LIKE ? OR e.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY e.start_date ASC';

        const [events] = await pool.query(query, params);

        // Get tickets for each event
        for (let event of events) {
            const [tickets] = await pool.query(
                'SELECT * FROM tickets WHERE event_id = ?',
                [event.id]
            );
            event.tickets = tickets;
        }

        res.json({ events });

    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// GET SINGLE EVENT (Public Details)
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [events] = await pool.query(
            'SELECT * FROM events WHERE id = ?',
            [id]
        );

        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = events[0];

        // Get tickets
        const [tickets] = await pool.query(
            'SELECT * FROM tickets WHERE event_id = ?',
            [id]
        );
        event.tickets = tickets;

        // Get speakers
        const [speakers] = await pool.query(
            'SELECT * FROM speakers WHERE event_id = ?',
            [id]
        );
        event.speakers = speakers;

        // Get sponsors
        const [sponsors] = await pool.query(
            'SELECT * FROM sponsors WHERE event_id = ?',
            [id]
        );
        event.sponsors = sponsors;

        // Get registration count
        const [regCount] = await pool.query(
            'SELECT COUNT(*) as count FROM registrations WHERE event_id = ?',
            [id]
        );
        event.registered_count = regCount[0].count;

        res.json({ event });

    } catch (error) {
        console.error('Get event error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// CREATE EVENT (Organizer only)
// ============================================
router.post('/', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ error: 'Only organizers can create events' });
        }

        const { title, description, category, start_date, end_date, venue_name, venue_address, is_online, capacity, status } = req.body;

        if (!title || !start_date) {
            return res.status(400).json({ error: 'Title and start date are required' });
        }

        const [result] = await pool.query(
            `INSERT INTO events (title, description, category, start_date, end_date, venue_name, venue_address, is_online, capacity, status, organizer_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, category, start_date, end_date, venue_name, venue_address, is_online || false, capacity || 100, status || 'draft', req.user.id]
        );

        res.status(201).json({
            message: 'Event created successfully',
            event_id: result.insertId
        });

    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// UPDATE EVENT (Organizer only)
// ============================================
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ error: 'Only organizers can update events' });
        }

        const { id } = req.params;
        const { title, description, category, start_date, end_date, venue_name, venue_address, is_online, capacity, status } = req.body;

        await pool.query(
            `UPDATE events SET 
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            category = COALESCE(?, category),
            start_date = COALESCE(?, start_date),
            end_date = COALESCE(?, end_date),
            venue_name = COALESCE(?, venue_name),
            venue_address = COALESCE(?, venue_address),
            is_online = COALESCE(?, is_online),
            capacity = COALESCE(?, capacity),
            status = COALESCE(?, status)
            WHERE id = ?`,
            [title, description, category, start_date, end_date, venue_name, venue_address, is_online, capacity, status, id]
        );

        res.json({ message: 'Event updated successfully' });

    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// DELETE EVENT (Organizer only)
// ============================================
router.delete('/events/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ error: 'Only organizers can delete events' });
        }

        const { id } = req.params;

        await pool.query('DELETE FROM events WHERE id = ?', [id]);

        res.json({ message: 'Event deleted successfully' });

    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// GET EVENT ATTENDEES (Organizer only)
// ============================================
router.get('/events/:id/attendees', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ error: 'Only organizers can view attendees' });
        }

        const { id } = req.params;

        const [registrations] = await pool.query(
            `SELECT r.*, u.username, u.email, u.full_name, t.name as ticket_name, t.price as ticket_price
            FROM registrations r
            JOIN users u ON r.user_id = u.id
            JOIN tickets t ON r.ticket_id = t.id
            WHERE r.event_id = ?
            ORDER BY r.registered_at DESC`,
            [id]
        );

        res.json({ attendees: registrations });

    } catch (error) {
        console.error('Get attendees error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// REGISTER FOR EVENT (User only)
// ============================================
router.post('/events/:id/register', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'user') {
            return res.status(403).json({ error: 'Only users can register for events' });
        }

        const { id } = req.params;
        const { ticket_id } = req.body;

        if (!ticket_id) {
            return res.status(400).json({ error: 'Ticket type is required' });
        }

        // Check if already registered
        const [existing] = await pool.query(
            'SELECT * FROM registrations WHERE user_id = ? AND event_id = ?',
            [req.user.id, id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already registered for this event' });
        }

        // Check ticket availability
        const [tickets] = await pool.query(
            'SELECT * FROM tickets WHERE id = ? AND event_id = ?',
            [ticket_id, id]
        );

        if (tickets.length === 0) {
            return res.status(400).json({ error: 'Invalid ticket type' });
        }

        const ticket = tickets[0];
        if (ticket.sold_count >= ticket.quantity) {
            return res.status(400).json({ error: 'Tickets sold out' });
        }

        // Generate QR code
        const qr_code = `QR_EVT${id}_USR${req.user.id}_${Date.now()}`;

        // Create registration
        const [result] = await pool.query(
            'INSERT INTO registrations (user_id, event_id, ticket_id, status, qr_code) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, id, ticket_id, 'registered', qr_code]
        );

        // Update sold count
        await pool.query(
            'UPDATE tickets SET sold_count = sold_count + 1 WHERE id = ?',
            [ticket_id]
        );

        res.status(201).json({
            message: 'Registration successful',
            qr_code
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// GET USER'S EVENTS
// ============================================
router.get('/my-events', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'user') {
            return res.status(403).json({ error: 'Only users have event registrations' });
        }

        const [registrations] = await pool.query(
            `SELECT r.*, e.title, e.start_date, e.end_date, e.venue_name, e.venue_address, e.cover_image,
            t.name as ticket_name, t.price as ticket_price
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            JOIN tickets t ON r.ticket_id = t.id
            WHERE r.user_id = ?
            ORDER BY e.start_date DESC`,
            [req.user.id]
        );

        res.json({ events: registrations });

    } catch (error) {
        console.error('Get my events error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// GET DASHBOARD STATS (Organizer only)
// ============================================
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'organizer') {
            return res.status(403).json({ error: 'Only organizers can view dashboard stats' });
        }

        // Total events
        const [totalEvents] = await pool.query('SELECT COUNT(*) as count FROM events');

        // Total attendees
        const [totalAttendees] = await pool.query('SELECT COUNT(*) as count FROM registrations');

        // Total revenue
        const [revenue] = await pool.query(
            `SELECT COALESCE(SUM(t.price), 0) as total 
            FROM registrations r 
            JOIN tickets t ON r.ticket_id = t.id 
            WHERE r.status = 'registered'`
        );

        // Upcoming events
        const [upcomingEvents] = await pool.query(
            "SELECT COUNT(*) as count FROM events WHERE start_date > NOW() AND status = 'published'"
        );

        // Recent registrations
        const [recentRegs] = await pool.query(
            `SELECT r.*, u.username, u.email, e.title as event_title
            FROM registrations r
            JOIN users u ON r.user_id = u.id
            JOIN events e ON r.event_id = e.id
            ORDER BY r.registered_at DESC
            LIMIT 10`
        );

        res.json({
            stats: {
                total_events: totalEvents[0].count,
                total_attendees: totalAttendees[0].count,
                total_revenue: revenue[0].total,
                upcoming_events: upcomingEvents[0].count
            },
            recent_registrations: recentRegs
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
