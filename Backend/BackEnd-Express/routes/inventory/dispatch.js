const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');
const { applyMovement } = require('../../Helpers/stockMovement');

router.post('/dispatch', async (req, res) => {
    const { do_number, lines, remarks, override_reason } = req.body;

    if (!do_number || !Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: do_number and a non-empty lines array are required.'
        });
    }

    for (const line of lines) {
        const qty = Number(line.quantity_mt);
        if (!line.batch_code || !line.location_id || isNaN(qty) || qty <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Each line requires batch_code, location_id, and a quantity_mt greater than 0.'
            });
        }
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const doResult = await client.query(
            'SELECT do_number, status FROM delivery_orders WHERE do_number = $1 FOR UPDATE',
            [do_number]
        );

        if (doResult.rows.length === 0) {
            const error = new Error(`Delivery order '${do_number}' not found.`);
            error.statusCode = 404;
            throw error;
        }

        let lineRemarks = remarks || null;
        if (override_reason) {
            const overrideNote = `FIFO OVERRIDE: ${override_reason}`;
            if (lineRemarks) {
                lineRemarks = `${overrideNote}. ${lineRemarks}`;
            } else {
                lineRemarks = overrideNote;
            }
        }

        const movements = [];
        for (const line of lines) {
            const newQty = await applyMovement(client, {
                batch_code: line.batch_code,
                location_id: line.location_id,
                movement_type: 'DISPATCH',
                quantity_change: -Number(line.quantity_mt),
                reference_doc: do_number,
                remarks: lineRemarks,
                performed_by: req.user.id
            });
            movements.push({ batch_code: line.batch_code, quantity_dispatched_mt: Number(line.quantity_mt), new_qty_mt: newQty });
        }

        await client.query(
            `UPDATE delivery_orders SET status = 'Dispatched' WHERE do_number = $1`,
            [do_number]
        );

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Dispatch processed successfully.',
            do_number,
            movements
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction failed for dispatch:', error);

        const statusCode = error.statusCode || 500;
        const errorMessage = statusCode === 500
            ? 'An internal server error occurred while processing the dispatch.'
            : error.message;

        return res.status(statusCode).json({ success: false, error: errorMessage });
    } finally {
        client.release();
    }
});

module.exports = router;
