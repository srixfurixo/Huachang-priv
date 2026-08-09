const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');


router.post('/purchase', async (req, res) => {

    const { po_number, supplier_id, item_code, po_date, ordered_qty_mt } = req.body;
    const created_by = req.user.id;

    if (!po_number || supplier_id === undefined || !item_code || !po_date || ordered_qty_mt === undefined) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: po_number, supplier_id, item_code, po_date, and ordered_qty_mt are required.'
        });
    }

    const requestedQty = Number(ordered_qty_mt);
    if (isNaN(requestedQty) || requestedQty <= 0) {
        return res.status(400).json({
            success: false,
            error: 'ordered_qty_mt must be a positive number greater than 0.'
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const dupCheckQuery = 'SELECT 1 FROM purchase_orders WHERE po_number = $1';
        const dupCheckResult = await client.query(dupCheckQuery, [po_number]);

        if (dupCheckResult.rows.length > 0) {
            const error = new Error('Purchase Order number already exists.');
            error.statusCode = 400;
            throw error;
        }

        const insertPoQuery = `
            INSERT INTO purchase_orders (
                po_number,
                supplier_id,
                item_code,
                po_date,
                ordered_qty_mt,
                created_by
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const insertValues = [
            po_number,
            supplier_id,
            item_code,
            po_date,
            requestedQty,
            created_by
        ];

        const insertResult = await client.query(insertPoQuery, insertValues);
        const newRecord = insertResult.rows[0];

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Purchase Order created successfully.',
            record: newRecord
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction failed for Purchase Order creation:', error);

        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                error: 'Database constraint violation: The referenced supplier, item, or user does not exist.'
            });
        }

        const statusCode = error.statusCode || 500;
        const errorMessage = statusCode === 500
            ? 'An internal server error occurred while registering the Purchase Order.'
            : error.message;

        return res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    } finally {
        client.release();
    }
});

module.exports = router;
