const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');
const authorize = require('../../middleware/authorize');
const { applyMovement } = require('../../Helpers/stockMovement');

router.post('/stocktake', async (req, res) => {
    const { location_id } = req.body;

    if (!location_id) {
        return res.status(400).json({ success: false, error: 'location_id is required.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const openCheck = await client.query(
            `SELECT id FROM stocktake_sessions WHERE location_id = $1 AND status = 'Open'`,
            [location_id]
        );

        if (openCheck.rows.length > 0) {
            const error = new Error(`Location '${location_id}' already has an open stocktake session (id ${openCheck.rows[0].id}).`);
            error.statusCode = 409;
            throw error;
        }

        const sessionResult = await client.query(
            `INSERT INTO stocktake_sessions (location_id, status, counted_by)
             VALUES ($1, 'Open', $2) RETURNING *`,
            [location_id, req.user.id]
        );

        const batchesResult = await client.query(
            `SELECT b.batch_code, b.item_code, i.description, b.current_qty::float AS system_qty
             FROM inventory_batches b
             JOIN items i ON i.item_code = b.item_code
             WHERE b.location_id = $1 AND b.current_qty > 0
             ORDER BY b.item_code, b.batch_code`,
            [location_id]
        );

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Stocktake session started.',
            session: sessionResult.rows[0],
            count_sheet: batchesResult.rows
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction failed for stocktake creation:', error);

        const statusCode = error.statusCode || 500;
        const errorMessage = statusCode === 500
            ? 'An internal server error occurred while starting the stocktake.'
            : error.message;

        return res.status(statusCode).json({ success: false, error: errorMessage });
    } finally {
        client.release();
    }
});

router.get('/stocktake', async (req, res) => {
    const { location_id, status } = req.query;
    const params = [];
    const filters = [];

    if (location_id) {
        params.push(location_id);
        filters.push(`s.location_id = $${params.length}`);
    }

    if (status) {
        params.push(status);
        filters.push(`s.status = $${params.length}`);
    }

    let whereClause = '';
    if (filters.length) {
        whereClause = `WHERE ${filters.join(' AND ')}`;
    }

    try {
        const result = await pool.query(`
            SELECT
                s.id, s.location_id, l.name AS location, s.status,
                counter.username AS counted_by, approver.username AS approved_by,
                s.created_at,
                COUNT(sl.id) AS line_count,
                COALESCE(SUM(sl.variance_qty), 0)::float AS total_variance
            FROM stocktake_sessions s
            JOIN locations l ON l.id = s.location_id
            LEFT JOIN users counter ON counter.id = s.counted_by
            LEFT JOIN users approver ON approver.id = s.approved_by
            LEFT JOIN stocktake_lines sl ON sl.session_id = s.id
            ${whereClause}
            GROUP BY s.id, s.location_id, l.name, s.status, counter.username, approver.username, s.created_at
            ORDER BY s.created_at DESC
        `, params);

        res.json({ success: true, sessions: result.rows });
    } catch (err) {
        console.error('Stocktake list error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load stocktake sessions' });
    }
});

router.get('/stocktake/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const sessionResult = await pool.query(`
            SELECT s.*, l.name AS location, counter.username AS counted_by_name, approver.username AS approved_by_name
            FROM stocktake_sessions s
            JOIN locations l ON l.id = s.location_id
            LEFT JOIN users counter ON counter.id = s.counted_by
            LEFT JOIN users approver ON approver.id = s.approved_by
            WHERE s.id = $1
        `, [id]);

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Stocktake session '${id}' not found.` });
        }

        const linesResult = await pool.query(`
            SELECT sl.*, i.description
            FROM stocktake_lines sl
            JOIN inventory_batches b ON b.batch_code = sl.batch_code
            JOIN items i ON i.item_code = b.item_code
            WHERE sl.session_id = $1
            ORDER BY sl.id
        `, [id]);

        res.json({ success: true, session: sessionResult.rows[0], lines: linesResult.rows });
    } catch (err) {
        console.error('Stocktake detail error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load stocktake session' });
    }
});

router.post('/stocktake/:id/submit', async (req, res) => {
    const { id } = req.params;
    const { lines } = req.body;

    if (!Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ success: false, error: 'A non-empty lines array is required.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const sessionResult = await client.query(
            'SELECT status FROM stocktake_sessions WHERE id = $1 FOR UPDATE',
            [id]
        );

        if (sessionResult.rows.length === 0) {
            const error = new Error(`Stocktake session '${id}' not found.`);
            error.statusCode = 404;
            throw error;
        }

        if (sessionResult.rows[0].status !== 'Open') {
            const error = new Error(`Stocktake session '${id}' is not Open.`);
            error.statusCode = 400;
            throw error;
        }

        for (const line of lines) {
            if (!line.batch_code || line.counted_qty === undefined) {
                const error = new Error('Each line requires batch_code and counted_qty.');
                error.statusCode = 400;
                throw error;
            }

            const batchResult = await client.query(
                'SELECT current_qty FROM inventory_batches WHERE batch_code = $1',
                [line.batch_code]
            );

            if (batchResult.rows.length === 0) {
                const error = new Error(`Batch '${line.batch_code}' not found.`);
                error.statusCode = 404;
                throw error;
            }

            const systemQty = Number(batchResult.rows[0].current_qty);
            const countedQty = Number(line.counted_qty);
            const varianceQty = countedQty - systemQty;

            await client.query(
                `INSERT INTO stocktake_lines (session_id, batch_code, system_qty, counted_qty, variance_qty)
                 VALUES ($1, $2, $3, $4, $5)`,
                [id, line.batch_code, systemQty, countedQty, varianceQty]
            );
        }

        await client.query(`UPDATE stocktake_sessions SET status = 'Submitted' WHERE id = $1`, [id]);

        await client.query('COMMIT');

        return res.status(201).json({ success: true, message: 'Stocktake submitted for approval.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction failed for stocktake submission:', error);

        const statusCode = error.statusCode || 500;
        const errorMessage = statusCode === 500
            ? 'An internal server error occurred while submitting the stocktake.'
            : error.message;

        return res.status(statusCode).json({ success: false, error: errorMessage });
    } finally {
        client.release();
    }
});

router.patch('/stocktake/:id/approve', authorize('Admin', 'Manager'), async (req, res) => {
    const { id } = req.params;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const sessionResult = await client.query(
            'SELECT status, location_id FROM stocktake_sessions WHERE id = $1 FOR UPDATE',
            [id]
        );

        if (sessionResult.rows.length === 0) {
            const error = new Error(`Stocktake session '${id}' not found.`);
            error.statusCode = 404;
            throw error;
        }

        if (sessionResult.rows[0].status !== 'Submitted') {
            const error = new Error(`Stocktake session '${id}' is not Submitted.`);
            error.statusCode = 400;
            throw error;
        }

        const linesResult = await client.query(
            'SELECT batch_code, variance_qty FROM stocktake_lines WHERE session_id = $1',
            [id]
        );

        for (const line of linesResult.rows) {
            const varianceQty = Number(line.variance_qty);
            if (varianceQty === 0) {
                continue;
            }

            const batchLocationResult = await client.query(
                'SELECT location_id FROM inventory_batches WHERE batch_code = $1',
                [line.batch_code]
            );

            await applyMovement(client, {
                batch_code: line.batch_code,
                location_id: batchLocationResult.rows[0].location_id,
                movement_type: 'ADJUSTMENT',
                quantity_change: varianceQty,
                reference_doc: `STOCKTAKE-${id}`,
                remarks: 'Physical stocktake count correction.',
                performed_by: req.user.id
            });
        }

        await client.query(
            `UPDATE stocktake_sessions SET status = 'Approved', approved_by = $1 WHERE id = $2`,
            [req.user.id, id]
        );

        await client.query('COMMIT');

        return res.json({ success: true, message: 'Stocktake approved and stock corrected.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction failed for stocktake approval:', error);

        const statusCode = error.statusCode || 500;
        const errorMessage = statusCode === 500
            ? 'An internal server error occurred while approving the stocktake.'
            : error.message;

        return res.status(statusCode).json({ success: false, error: errorMessage });
    } finally {
        client.release();
    }
});

router.patch('/stocktake/:id/cancel', async (req, res) => {
    const { id } = req.params;

    try {
        const existing = await pool.query('SELECT status FROM stocktake_sessions WHERE id = $1', [id]);

        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Stocktake session '${id}' not found.` });
        }

        if (existing.rows[0].status === 'Submitted' || existing.rows[0].status === 'Approved') {
            return res.status(400).json({ success: false, error: `Stocktake session '${id}' has already been submitted and cannot be cancelled.` });
        }

        const result = await pool.query(
            `UPDATE stocktake_sessions SET status = 'Cancelled' WHERE id = $1 RETURNING *`,
            [id]
        );

        res.json({ success: true, message: 'Stocktake session cancelled.', session: result.rows[0] });
    } catch (err) {
        console.error('Stocktake cancel error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to cancel stocktake session' });
    }
});

module.exports = router;
