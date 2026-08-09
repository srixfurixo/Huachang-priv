const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');
const { applyMovement } = require('../../Helpers/stockMovement');

router.get('/intake/pending', async (req, res) => {
    const { location_id, from, to, submitted_by } = req.query;
    const params = [];
    const filters = [`b.status_confidence = 'Pending'`];

    if (location_id) {
        params.push(location_id);
        filters.push(`b.location_id = $${params.length}`);
    }

    if (from) {
        params.push(from);
        filters.push(`b.created_at >= $${params.length}::date`);
    }

    if (to) {
        params.push(to);
        filters.push(`b.created_at < ($${params.length}::date + INTERVAL '1 day')`);
    }

    if (submitted_by) {
        params.push(submitted_by);
        filters.push(`im.performed_by = $${params.length}`);
    }

    let whereClause = '';
    if (filters.length) {
        whereClause = `WHERE ${filters.join(' AND ')}`;
    }

    try {
        const result = await pool.query(`
            SELECT
                b.batch_code,
                b.item_code,
                i.description,
                l.name AS location,
                b.current_qty::float AS quantity_mt,
                b.hg_ca_number,
                hca.quantity_mt::float AS ca_expected_qty_mt,
                (b.current_qty - hca.quantity_mt)::float AS variance_mt,
                u.username AS submitted_by,
                b.created_at AS submitted_at,
                EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 3600 AS hours_waiting
            FROM inventory_batches b
            JOIN items i ON i.item_code = b.item_code
            JOIN locations l ON l.id = b.location_id
            LEFT JOIN huachang_collection_advices hca ON hca.hg_ca_number = b.hg_ca_number
            LEFT JOIN inventory_movements im ON im.batch_code = b.batch_code AND im.movement_type = 'INTAKE'
            LEFT JOIN users u ON u.id = im.performed_by
            ${whereClause}
            ORDER BY b.created_at ASC;
        `, params);

        res.json({ success: true, pending_intakes: result.rows });
    } catch (err) {
        console.error('Pending intake list error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load pending intakes' });
    }
});

router.patch('/intake/:batch_code/verify', async (req, res) => {
    const { batch_code } = req.params;

    try {
        const result = await pool.query(
            `UPDATE inventory_batches
             SET status_confidence = 'Live', verified_by = $1, verified_at = CURRENT_TIMESTAMP
             WHERE batch_code = $2 AND status_confidence = 'Pending'
             RETURNING *`,
            [req.user.id, batch_code]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, error: `Batch '${batch_code}' is not pending verification.` });
        }

        res.json({ success: true, message: 'Batch verified successfully.', batch: result.rows[0] });
    } catch (err) {
        console.error('Intake verify error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to verify intake' });
    }
});

router.patch('/intake/:batch_code/reject', async (req, res) => {
    const { batch_code } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
        return res.status(400).json({ success: false, error: 'A rejection reason is required.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const batchResult = await client.query(
            'SELECT status_confidence, current_qty, location_id, hg_ca_number FROM inventory_batches WHERE batch_code = $1 FOR UPDATE',
            [batch_code]
        );

        if (batchResult.rows.length === 0) {
            const error = new Error(`Batch '${batch_code}' not found.`);
            error.statusCode = 404;
            throw error;
        }

        const batch = batchResult.rows[0];

        if (batch.status_confidence !== 'Pending') {
            const error = new Error(`Batch '${batch_code}' is not pending verification.`);
            error.statusCode = 400;
            throw error;
        }

        await client.query(
            `UPDATE inventory_batches
             SET status_confidence = 'Rejected', rejection_reason = $1, verified_by = $2, verified_at = CURRENT_TIMESTAMP
             WHERE batch_code = $3`,
            [reason, req.user.id, batch_code]
        );

        await applyMovement(client, {
            batch_code,
            location_id: batch.location_id,
            movement_type: 'ADJUSTMENT',
            quantity_change: -Number(batch.current_qty),
            reference_doc: `REJECT-${batch_code}`,
            remarks: `Intake rejected: ${reason}`,
            performed_by: req.user.id
        });

        if (batch.hg_ca_number) {
            await client.query(
                `UPDATE huachang_collection_advices SET status = 'Dispatched' WHERE hg_ca_number = $1`,
                [batch.hg_ca_number]
            );
        }

        await client.query('COMMIT');

        return res.json({ success: true, message: 'Batch rejected and stock zeroed out.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Intake reject error:', error);

        const statusCode = error.statusCode || 500;
        const errorMessage = statusCode === 500
            ? 'An internal server error occurred while rejecting the intake.'
            : error.message;

        return res.status(statusCode).json({ success: false, error: errorMessage });
    } finally {
        client.release();
    }
});

module.exports = router;
