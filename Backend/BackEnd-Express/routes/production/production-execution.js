const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

router.post('/orders/:id/step1/retrieve-materials', async (req, res) => {
    const orderId = parseInt(req.params.id, 10);
    const { retrievals } = req.body;
    const workerId = req.user ? (req.user.id || req.user.userId) : null;
    if (isNaN(orderId) || !Array.isArray(retrievals) || retrievals.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid order ID or empty retrievals array.' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const orderCheck = await client.query(
            'SELECT id, status FROM production_orders WHERE id = $1 FOR UPDATE',
            [orderId]
        );
        if (orderCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Production order not found.' });
        }
        if (['Completed', 'Cancelled'].includes(orderCheck.rows[0].status)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'Cannot update completed or cancelled order.' });
        }
        if (orderCheck.rows[0].status !== 'In_Progress') {
            await client.query("UPDATE production_orders SET status = 'In_Progress' WHERE id = $1", [orderId]);
        }
        const updatedAllocations = [];
        for (const item of retrievals) {
            const actualMt = Number(item.actual_retrieved_mt) || 0;
            const allocationId = parseInt(item.allocation_id, 10);
            const allocRes = await client.query(
                'SELECT allocated_qty_mt FROM production_material_allocations WHERE id = $1 AND production_order_id = $2 FOR UPDATE',
                [allocationId, orderId]
            );
            if (allocRes.rows.length > 0) {
                const neededMt = Number(allocRes.rows[0].allocated_qty_mt) || 0;
                let status = 'Pending';
                if (actualMt >= neededMt && neededMt > 0) {
                    status = 'Fully_Retrieved';
                } else if (actualMt > 0) {
                    status = 'Partial';
                }
                const updateRes = await client.query(
                    'UPDATE production_material_allocations SET actual_retrieved_mt = $1, status = $2, retrieved_at = NOW(), retrieved_by = $3 WHERE id = $4 RETURNING id, raw_item_code, allocated_qty_mt, actual_retrieved_mt, status',
                    [actualMt, status, workerId, allocationId]
                );
                updatedAllocations.push(updateRes.rows[0]);
            }
        }
        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: 'Material retrievals updated successfully.', allocations: updatedAllocations });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to update material retrievals:', error);
        return res.status(500).json({ success: false, error: 'Failed to update material retrievals.' });
    } finally {
        client.release();
    }
});

router.post('/orders/:id/step2/log-mixing', async (req, res) => {
    const orderId = parseInt(req.params.id, 10);
    const { shift_name, mixed_tonnage_mt, remarks } = req.body;
    const mixedMt = Number(mixed_tonnage_mt);
    const workerId = req.user ? (req.user.id || req.user.userId) : null;

    if (isNaN(orderId) || isNaN(mixedMt) || mixedMt <= 0 || !shift_name) {
        return res.status(400).json({ success: false, error: 'Invalid order ID, shift name, or mixed tonnage.' });
    }

    try {
        const orderCheck = await pool.query(
            'SELECT id, status FROM production_orders WHERE id = $1',
            [orderId]
        );

        if (orderCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Production order not found.' });
        }

        if (['Completed', 'Cancelled'].includes(orderCheck.rows[0].status)) {
            return res.status(400).json({ success: false, error: 'Cannot log mixing for completed or cancelled order.' });
        }

        if (orderCheck.rows[0].status !== 'In_Progress') {
            await pool.query("UPDATE production_orders SET status = 'In_Progress' WHERE id = $1", [orderId]);
        }

        const insertQuery = `
            INSERT INTO production_progress_logs (
                production_order_id, stage_name, shift_date, shift_name,
                tonnage_processed, units_packed, waste_kg, remarks, logged_by, created_at
            )
            VALUES ($1, 'Mixing', CURRENT_DATE, $2, $3, 0, 0, $4, $5, NOW())
            RETURNING id, production_order_id, stage_name, shift_date, shift_name, tonnage_processed, remarks, created_at;
        `;

        const { rows } = await pool.query(insertQuery, [
            orderId,
            shift_name,
            mixedMt,
            remarks || null,
            workerId
        ]);

        return res.status(200).json({
            success: true,
            message: 'Mixing progress logged successfully.',
            log: rows[0]
        });
    } catch (error) {
        console.error('Failed to log mixing progress:', error);
        return res.status(500).json({ success: false, error: 'Failed to log mixing progress.' });
    }
});

router.post('/orders/:id/step3/log-output', async (req, res) => {
    const orderId = parseInt(req.params.id, 10);
    const { shift_name, packed_tonnage_mt, units_packed, remarks } = req.body;
    const packedMt = Number(packed_tonnage_mt);
    const units = parseInt(units_packed, 10);
    const workerId = req.user ? (req.user.id || req.user.userId) : null;
    if (isNaN(orderId) || isNaN(packedMt) || packedMt <= 0 || isNaN(units) || units < 0 || !shift_name) {
        return res.status(400).json({ success: false, error: 'Invalid order ID, shift, packed tonnage, or bag count.' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const orderCheck = await client.query(
            'SELECT id, target_qty_mt, status FROM production_orders WHERE id = $1 FOR UPDATE',
            [orderId]
        );
        if (orderCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Production order not found.' });
        }
        if (['Completed', 'Cancelled'].includes(orderCheck.rows[0].status)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'Cannot log output for completed or cancelled order.' });
        }
        const insertQuery = `
            INSERT INTO production_progress_logs (
                production_order_id, stage_name, shift_date, shift_name,
                tonnage_processed, units_packed, waste_kg, remarks, logged_by, created_at
            )
            VALUES ($1, 'Packaging', CURRENT_DATE, $2, $3, $4, 0, $5, $6, NOW())
            RETURNING id, production_order_id, stage_name, shift_date, shift_name, tonnage_processed, units_packed, remarks, created_at;
        `;
        const logRes = await client.query(insertQuery, [orderId, shift_name, packedMt, units, remarks || null, workerId]);
        const sumRes = await client.query(
            `SELECT COALESCE(SUM(tonnage_processed), 0)::float AS total_packed_mt
             FROM production_progress_logs
             WHERE production_order_id = $1 AND stage_name = 'Packaging'`,
            [orderId]
        );
        const totalPacked = Number(sumRes.rows[0].total_packed_mt) || 0;
        const targetQty = Number(orderCheck.rows[0].target_qty_mt) || 0;
        let newStatus = orderCheck.rows[0].status;
        if (totalPacked >= targetQty && targetQty > 0) {
            newStatus = 'Pending_QC_Inspection';
            await client.query("UPDATE production_orders SET status = 'Pending_QC_Inspection' WHERE id = $1", [orderId]);
        } else if (newStatus !== 'In_Progress') {
            newStatus = 'In_Progress';
            await client.query("UPDATE production_orders SET status = 'In_Progress' WHERE id = $1", [orderId]);
        }
        await client.query('COMMIT');
        return res.status(200).json({
            success: true,
            message: 'Packaging output logged successfully.',
            order_status: newStatus,
            log: logRes.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to log packaging output:', error);
        return res.status(500).json({ success: false, error: 'Failed to log packaging output.' });
    } finally {
        client.release();
    }
});

module.exports = router;
