const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Get timeline for an event
router.get('/:eventName', async (req, res) => {
    try {
        const { eventName } = req.params;

        const [timelines] = await pool.query('SELECT * FROM timelines WHERE event_name = ?', [eventName]);
        if (timelines.length === 0) {
            return res.json({ tasks: [] });
        }

        const timelineId = timelines[0].id;

        const [tasks] = await pool.query('SELECT * FROM timeline_tasks WHERE timeline_id = ? ORDER BY time ASC', [timelineId]);

        res.json({ id: timelineId, eventName, tasks });
    } catch (error) {
        console.error('Error fetching timeline:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add a timeline task
router.post('/:eventName/tasks', async (req, res) => {
    try {
        const { eventName } = req.params;
        const { time, title, description, type, status } = req.body;

        // Ensure timeline exists
        let [timelines] = await pool.query('SELECT * FROM timelines WHERE event_name = ?', [eventName]);
        let timelineId;
        if (timelines.length === 0) {
            const [result] = await pool.query('INSERT INTO timelines (event_name) VALUES (?)', [eventName]);
            timelineId = result.insertId;
        } else {
            timelineId = timelines[0].id;
        }

        const [result] = await pool.query(
            'INSERT INTO timeline_tasks (timeline_id, time, title, description, type, status) VALUES (?, ?, ?, ?, ?, ?)',
            [timelineId, time, title, description, type || 'default', status || 'pending']
        );
        res.status(201).json({ message: 'Timeline task added', taskId: result.insertId });

    } catch (error) {
        console.error('Error adding timeline task:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
