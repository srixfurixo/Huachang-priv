const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');
const { applyMovement } = require('../../Helpers/stockMovement');

router.post('/return', async (req, res) => {
    const { batch_code, location_id, quantity_mt, do_number, reason, item_code } = req.body;

    if (!batch_code || !location_id || quantity_mt === undefined) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: batch_code, location_id, and quantity_mt are required.'
        });
    }

    const requestedQty = Number(quantity_mt);
    if (isNaN(requestedQty) || requestedQty <= 0) {
        return res.status(400).json({
            success: false,
            error: 'quantity_mt must be a positive number greater than 0.'
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const existingBatch = await client.query(
            'SELECT location_id FROM inventory_batches WHERE batch_code = $1 FOR UPDATE',
            [batch_code]
        );

        let effectiveLocationId = location_id;

        if (existingBatch.rows.length === 0) {
            if (!item_code) {
                const error = new Error(`Batch '${batch_code}' no longer exists. item_code is required to recreate it for the return.`);
                error.statusCode = 400;
                throw error;
            }

            const destLocationResult = await client.query(
                'SELECT location_type FROM locations WHERE id = $1',
                [location_id]
            );

            if (destLocationResult.rows.length === 0) {
                const error = new Error(`Location '${location_id}' not found.`);
                error.statusCode = 404;
                throw error;
            }

            const status = destLocationResult.rows[0].location_type === 'Internal' ? 'Live' : 'Reported';

            await client.query(
                `INSERT INTO inventory_batches (batch_code, item_code, location_id, current_qty, status_confidence)
                 VALUES ($1, $2, $3, 0, $4)`,
                [batch_code, item_code, location_id, status]
            );
        } else {
            effectiveLocationId = existingBatch.rows[0].location_id;
        }

        const newQty = await applyMovement(client, {
            batch_code,
            location_id: effectiveLocationId,
            movement_type: 'RETURN',
            quantity_change: requestedQty,
            reference_doc: do_number || null,
            remarks: reason || null,
            performed_by: req.user.id
        });

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Return processed successfully.',
            batch_code,
            new_qty_mt: newQty
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction failed for return:', error);

        const statusCode = error.statusCode || 500;
        const errorMessage = statusCode === 500
            ? 'An internal server error occurred while processing the return.'
            : error.message;

        return res.status(statusCode).json({ success: false, error: errorMessage });
    } finally {
        client.release();
    }
});

module.exports = router;
