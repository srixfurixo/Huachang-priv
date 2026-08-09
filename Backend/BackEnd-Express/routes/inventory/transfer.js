const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');
const { applyMovement } = require('../../Helpers/stockMovement');

router.post('/transfer', async (req, res) => {
    const { batch_code, to_location_id, quantity_mt, remarks } = req.body;

    if (!batch_code || !to_location_id || quantity_mt === undefined) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: batch_code, to_location_id, and quantity_mt are required.'
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

        const sourceResult = await client.query(
            `SELECT item_code, location_id, current_qty, manufacture_date, expiry_date, hg_ca_number
             FROM inventory_batches WHERE batch_code = $1 FOR UPDATE`,
            [batch_code]
        );

        if (sourceResult.rows.length === 0) {
            const error = new Error(`Batch '${batch_code}' not found.`);
            error.statusCode = 404;
            throw error;
        }

        const source = sourceResult.rows[0];

        if (String(source.location_id) === String(to_location_id)) {
            const error = new Error('Destination location must be different from the source location.');
            error.statusCode = 400;
            throw error;
        }

        if (requestedQty > Number(source.current_qty)) {
            const error = new Error(`Transfer quantity ${requestedQty} MT exceeds available stock ${source.current_qty} MT on batch '${batch_code}'.`);
            error.statusCode = 400;
            throw error;
        }

        const destLocationResult = await client.query(
            'SELECT location_type FROM locations WHERE id = $1',
            [to_location_id]
        );

        if (destLocationResult.rows.length === 0) {
            const error = new Error(`Destination location '${to_location_id}' not found.`);
            error.statusCode = 404;
            throw error;
        }

        const destStatus = destLocationResult.rows[0].location_type === 'Internal' ? 'Live' : 'Reported';

        await applyMovement(client, {
            batch_code,
            location_id: source.location_id,
            movement_type: 'TRANSFER_OUT',
            quantity_change: -requestedQty,
            reference_doc: batch_code,
            remarks: remarks || null,
            performed_by: req.user.id
        });

        const prefix = `${batch_code}-T`;
        const countResult = await client.query(
            `SELECT COUNT(*) AS cnt FROM inventory_batches WHERE batch_code LIKE $1`,
            [`${prefix}%`]
        );
        const destBatchCode = `${prefix}${Number(countResult.rows[0].cnt) + 1}`;

        const destBatchResult = await client.query(
            `INSERT INTO inventory_batches (
                batch_code, item_code, hg_ca_number, location_id, current_qty,
                manufacture_date, expiry_date, status_confidence
            ) VALUES ($1, $2, $3, $4, 0, $5, $6, $7)
            RETURNING *`,
            [destBatchCode, source.item_code, source.hg_ca_number, to_location_id, source.manufacture_date, source.expiry_date, destStatus]
        );
        const destBatch = destBatchResult.rows[0];

        const newDestQty = await applyMovement(client, {
            batch_code: destBatchCode,
            location_id: to_location_id,
            movement_type: 'TRANSFER_IN',
            quantity_change: requestedQty,
            reference_doc: batch_code,
            remarks: remarks || null,
            performed_by: req.user.id
        });

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Transfer completed successfully.',
            source_batch_code: batch_code,
            destination_batch: { ...destBatch, current_qty: newDestQty }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction failed for transfer:', error);

        const statusCode = error.statusCode || 500;
        const errorMessage = statusCode === 500
            ? 'An internal server error occurred while processing the transfer.'
            : error.message;

        return res.status(statusCode).json({ success: false, error: errorMessage });
    } finally {
        client.release();
    }
});

module.exports = router;
