const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Get checklist for an event
router.get('/:eventName', async (req, res) => {
    try {
        const { eventName } = req.params;

        const [checklists] = await pool.query('SELECT * FROM checklists WHERE event_name = ?', [eventName]);
        if (checklists.length === 0) {
            return res.json({ categories: [] });
        }

        const checklistId = checklists[0].id;

        const [categories] = await pool.query('SELECT * FROM checklist_categories WHERE checklist_id = ?', [checklistId]);

        for (let category of categories) {
            const [tasks] = await pool.query('SELECT * FROM checklist_tasks WHERE category_id = ?', [category.id]);
            category.tasks = tasks.map(t => ({ id: t.id, title: t.title, completed: !!t.completed }));
        }

        res.json({ id: checklistId, eventName, categories });
    } catch (error) {
        console.error('Error fetching checklist:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create/Add a task to a checklist category
router.post('/:eventName/tasks', async (req, res) => {
    try {
        const { eventName } = req.params;
        const { categoryName, title, completed } = req.body;

        // Ensure checklist exists
        let [checklists] = await pool.query('SELECT * FROM checklists WHERE event_name = ?', [eventName]);
        let checklistId;
        if (checklists.length === 0) {
            const [result] = await pool.query('INSERT INTO checklists (event_name) VALUES (?)', [eventName]);
            checklistId = result.insertId;
        } else {
            checklistId = checklists[0].id;
        }

        // Ensure category exists
        let [categories] = await pool.query('SELECT * FROM checklist_categories WHERE checklist_id = ? AND name = ?', [checklistId, categoryName]);
        let categoryId;
        if (categories.length === 0) {
            const [result] = await pool.query('INSERT INTO checklist_categories (checklist_id, name) VALUES (?, ?)', [checklistId, categoryName]);
            categoryId = result.insertId;
        } else {
            categoryId = categories[0].id;
        }

        // Add task
        const [result] = await pool.query('INSERT INTO checklist_tasks (category_id, title, completed) VALUES (?, ?, ?)', [categoryId, title, completed ? 1 : 0]);
        res.status(201).json({ message: 'Task added', taskId: result.insertId });

    } catch (error) {
        console.error('Error adding checklist task:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Toggle task completion
router.put('/tasks/:taskId/toggle', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { completed } = req.body;

        await pool.query('UPDATE checklist_tasks SET completed = ? WHERE id = ?', [completed ? 1 : 0, taskId]);
        res.json({ message: 'Task updated' });
    } catch (error) {
        console.error('Error toggling task:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
