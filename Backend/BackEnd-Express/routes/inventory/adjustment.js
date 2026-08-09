const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');
const { applyMovement } = require('../../Helpers/stockMovement');

router.post('/adjustment', async (req, res) => {
    const { batch_code, quantity_change, reason } = req.body;

    if (!batch_code || quantity_change === undefined) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: batch_code and quantity_change are required.'
        });
    }

    if (!reason || !reason.trim()) {
        return res.status(400).json({
            success: false,
            error: 'A reason is required for stock adjustments.'
        });
    }

    const change = Number(quantity_change);
    if (isNaN(change) || change === 0) {
        return res.status(400).json({
            success: false,
            error: 'quantity_change must be a non-zero number.'
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const batchResult = await client.query(
            'SELECT location_id FROM inventory_batches WHERE batch_code = $1',
            [batch_code]
        );

        if (batchResult.rows.length === 0) {
            const error = new Error(`Batch '${batch_code}' not found.`);
            error.statusCode = 404;
            throw error;
        }

        const newQty = await applyMovement(client, {
            batch_code,
            location_id: batchResult.rows[0].location_id,
            movement_type: 'ADJUSTMENT',
            quantity_change: change,
            reference_doc: `ADJ-${Date.now()}`,
            remarks: reason,
            performed_by: req.user.id
        });

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Stock adjustment applied successfully.',
            batch_code,
            new_qty_mt: newQty
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction failed for adjustment:', error);

        const statusCode = error.statusCode || 500;
        const errorMessage = statusCode === 500
            ? 'An internal server error occurred while processing the adjustment.'
            : error.message;

        return res.status(statusCode).json({ success: false, error: errorMessage });
    } finally {
        client.release();
    }
});

module.exports = router;
