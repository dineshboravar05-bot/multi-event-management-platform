// Management API Routes
const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Helper macro for CRUD operations
const generateCRUDRoutes = (tableName) => {
    // GET all
    router.get(`/${tableName}`, async (req, res) => {
        try {
            const [rows] = await pool.query(`SELECT * FROM ${tableName} ORDER BY created_at DESC`);
            res.json(rows);
        } catch (error) {
            console.error(`Get ${tableName} error:`, error);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // POST create
    router.post(`/${tableName}`, authenticateToken, async (req, res) => {
        try {
            const data = req.body;
            const columns = Object.keys(data).join(', ');
            const placeholders = Object.keys(data).map(() => '?').join(', ');
            const values = Object.values(data);

            const [result] = await pool.query(
                `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
                values
            );
            res.status(201).json({ id: result.insertId, ...data });
        } catch (error) {
            console.error(`Create ${tableName} error:`, error);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // PUT update
    router.put(`/${tableName}/:id`, authenticateToken, async (req, res) => {
        try {
            const data = req.body;
            const updates = Object.keys(data).map(col => `${col} = ?`).join(', ');
            const values = [...Object.values(data), req.params.id];

            await pool.query(
                `UPDATE ${tableName} SET ${updates} WHERE id = ?`,
                values
            );
            res.json({ id: req.params.id, ...data });
        } catch (error) {
            console.error(`Update ${tableName} error:`, error);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // DELETE
    router.delete(`/${tableName}/:id`, authenticateToken, async (req, res) => {
        try {
            await pool.query(`DELETE FROM ${tableName} WHERE id = ?`, [req.params.id]);
            res.json({ message: 'Deleted successfully' });
        } catch (error) {
            console.error(`Delete ${tableName} error:`, error);
            res.status(500).json({ error: 'Server error' });
        }
    });
};

// Generate routes for each table
generateCRUDRoutes('decorators');
generateCRUDRoutes('vendors');
generateCRUDRoutes('staff');
generateCRUDRoutes('venues');
generateCRUDRoutes('budgets');
generateCRUDRoutes('reports');

module.exports = router;
