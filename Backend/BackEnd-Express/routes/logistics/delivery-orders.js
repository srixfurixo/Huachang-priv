const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

router.post('/delivery-order', async (req, res) => {
    const { do_number, do_date, customer_id, lines } = req.body;

    if (!do_number || !do_date || customer_id === undefined || !Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: do_number, do_date, customer_id, and a non-empty lines array are required.'
        });
    }

    for (const line of lines) {
        const qty = Number(line.quantity_mt);
        if (!line.item_code || !line.uom || isNaN(qty) || qty <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Each line requires item_code, uom, and a quantity_mt greater than 0.'
            });
        }
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const dupCheckResult = await client.query('SELECT 1 FROM delivery_orders WHERE do_number = $1', [do_number]);
        if (dupCheckResult.rows.length > 0) {
            const error = new Error(`Delivery order '${do_number}' already exists.`);
            error.statusCode = 409;
            throw error;
        }

        const customerResult = await client.query('SELECT debtor_code, name FROM customers WHERE id = $1', [customer_id]);
        if (customerResult.rows.length === 0) {
            const error = new Error('Customer not found.');
            error.statusCode = 404;
            throw error;
        }
        const { debtor_code, name: debtor_name } = customerResult.rows[0];

        const headerResult = await client.query(
            `INSERT INTO delivery_orders (do_number, do_date, customer_id, debtor_code, debtor_name, status)
             VALUES ($1, $2, $3, $4, $5, 'Pending')
             RETURNING *`,
            [do_number, do_date, customer_id, debtor_code, debtor_name]
        );

        let lineNo = 1;
        const insertedLines = [];
        for (const line of lines) {
            const lineResult = await client.query(
                `INSERT INTO delivery_order_lines (do_number, line_no, item_code, description, uom, quantity_mt)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [do_number, lineNo, line.item_code, line.description || null, line.uom, line.quantity_mt]
            );
            insertedLines.push(lineResult.rows[0]);
            lineNo += 1;
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Delivery order created successfully.',
            delivery_order: headerResult.rows[0],
            lines: insertedLines
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction failed for delivery order creation:', error);

        const statusCode = error.statusCode || 500;
        const errorMessage = statusCode === 500
            ? 'An internal server error occurred while creating the delivery order.'
            : error.message;

        return res.status(statusCode).json({ success: false, error: errorMessage });
    } finally {
        client.release();
    }
});

router.get('/delivery-orders', async (req, res) => {
    const { status, customer_id, from, to } = req.query;
    const params = [];
    const filters = [];

    if (status) {
        params.push(status);
        filters.push(`do_.status = $${params.length}`);
    }

    if (customer_id) {
        params.push(customer_id);
        filters.push(`do_.customer_id = $${params.length}`);
    }

    if (from) {
        params.push(from);
        filters.push(`do_.do_date >= $${params.length}::date`);
    }

    if (to) {
        params.push(to);
        filters.push(`do_.do_date < ($${params.length}::date + INTERVAL '1 day')`);
    }

    let whereClause = '';
    if (filters.length) {
        whereClause = `WHERE ${filters.join(' AND ')}`;
    }

    try {
        const result = await pool.query(`
            SELECT
                do_.do_number,
                do_.do_date,
                do_.customer_id,
                do_.debtor_name AS customer_name,
                do_.status,
                COUNT(l.id) AS line_count,
                COALESCE(SUM(l.quantity_mt), 0)::float AS total_quantity_mt
            FROM delivery_orders do_
            LEFT JOIN delivery_order_lines l ON l.do_number = do_.do_number
            ${whereClause}
            GROUP BY do_.do_number, do_.do_date, do_.customer_id, do_.debtor_name, do_.status
            ORDER BY do_.do_date DESC;
        `, params);

        res.json({ success: true, delivery_orders: result.rows });
    } catch (err) {
        console.error('Delivery orders list error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load delivery orders' });
    }
});

router.get('/delivery-orders/:do_number', async (req, res) => {
    const { do_number } = req.params;

    try {
        const headerResult = await pool.query('SELECT * FROM delivery_orders WHERE do_number = $1', [do_number]);

        if (headerResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Delivery order '${do_number}' not found.` });
        }

        const linesResult = await pool.query(
            'SELECT * FROM delivery_order_lines WHERE do_number = $1 ORDER BY line_no ASC',
            [do_number]
        );

        const movementsResult = await pool.query(
            `SELECT im.id, im.batch_code, b.item_code, ABS(im.quantity_change)::float AS quantity_mt, im.movement_date
             FROM inventory_movements im
             JOIN inventory_batches b ON b.batch_code = im.batch_code
             WHERE im.reference_doc = $1 AND im.movement_type = 'DISPATCH'
             ORDER BY im.movement_date ASC`,
            [do_number]
        );

        res.json({
            success: true,
            delivery_order: headerResult.rows[0],
            lines: linesResult.rows,
            dispatched_movements: movementsResult.rows
        });
    } catch (err) {
        console.error('Delivery order detail error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load delivery order' });
    }
});

router.patch('/delivery-orders/:do_number/cancel', async (req, res) => {
    const { do_number } = req.params;

    try {
        const dispatchedCheck = await pool.query(
            `SELECT 1 FROM inventory_movements WHERE reference_doc = $1 AND movement_type = 'DISPATCH' LIMIT 1`,
            [do_number]
        );

        if (dispatchedCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Stock has already been dispatched against this delivery order. Use a RETURN to reverse it instead.'
            });
        }

        const result = await pool.query(
            `UPDATE delivery_orders SET status = 'Cancelled' WHERE do_number = $1 RETURNING *`,
            [do_number]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Delivery order '${do_number}' not found.` });
        }

        res.json({ success: true, message: 'Delivery order cancelled.', delivery_order: result.rows[0] });
    } catch (err) {
        console.error('Delivery order cancel error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to cancel delivery order' });
    }
});

module.exports = router;
