const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

router.get('/orders/:id/allocations', async (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT
            pma.id,
            pma.production_order_id,
            pma.raw_item_code,
            i.description AS raw_item_description,
            pma.source_type,
            pma.source_ref,
            pma.allocated_qty_mt::float,
            pma.actual_retrieved_mt::float,
            pma.status,
            pma.retrieved_at,
            u.username AS retrieved_by_username
        FROM production_material_allocations pma
        JOIN items i ON pma.raw_item_code = i.item_code
        LEFT JOIN users u ON pma.retrieved_by = u.id
        WHERE pma.production_order_id = $1
        ORDER BY pma.id ASC;
    `;

    try {
        const { rows } = await pool.query(query, [id]);
        return res.status(200).json({ success: true, allocations: rows });
    } catch (error) {
        console.error('Failed to fetch allocations:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch allocations.' });
    }
});

router.patch('/allocations/:allocation_id', async (req, res) => {
    const { allocation_id } = req.params;
    const { allocated_qty_mt } = req.body;

    const qty = Number(allocated_qty_mt);
    if (allocated_qty_mt === undefined || isNaN(qty) || qty <= 0) {
        return res.status(400).json({
            success: false,
            error: 'allocated_qty_mt must be a valid number greater than 0.'
        });
    }

    try {
        const checkQuery = `
            SELECT
                pma.id,
                pma.status AS allocation_status,
                po.status AS order_status
            FROM production_material_allocations pma
            JOIN production_orders po ON pma.production_order_id = po.id
            WHERE pma.id = $1;
        `;
        const checkResult = await pool.query(checkQuery, [allocation_id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Allocation not found.' });
        }

        const { allocation_status, order_status } = checkResult.rows[0];

        if (allocation_status !== 'Reserved' || !['Draft', 'Pending_Supervisor_Approval'].includes(order_status)) {
            return res.status(400).json({
                success: false,
                error: 'Cannot modify allocation after processing or retrieval has started.'
            });
        }

        const updateResult = await pool.query(
            `UPDATE production_material_allocations
             SET allocated_qty_mt = $1
             WHERE id = $2
             RETURNING *;`,
            [qty, allocation_id]
        );

        return res.status(200).json({
            success: true,
            message: 'Allocation updated successfully.',
            allocation: updateResult.rows[0]
        });
    } catch (error) {
        console.error('Failed to update allocation:', error);
        return res.status(500).json({ success: false, error: 'Failed to update allocation.' });
    }
});

router.delete('/allocations/:allocation_id', async (req, res) => {
    const { allocation_id } = req.params;

    try {
        const checkQuery = `
            SELECT
                pma.id,
                pma.status AS allocation_status,
                po.status AS order_status
            FROM production_material_allocations pma
            JOIN production_orders po ON pma.production_order_id = po.id
            WHERE pma.id = $1;
        `;
        const checkResult = await pool.query(checkQuery, [allocation_id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Allocation not found.' });
        }

        const { allocation_status, order_status } = checkResult.rows[0];

        if (allocation_status !== 'Reserved' || !['Draft', 'Pending_Supervisor_Approval'].includes(order_status)) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete allocation in current status.'
            });
        }

        await pool.query('DELETE FROM production_material_allocations WHERE id = $1;', [allocation_id]);

        return res.status(200).json({
            success: true,
            message: 'Raw material allocation removed successfully.'
        });
    } catch (error) {
        console.error('Failed to delete allocation:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete allocation.' });
    }
});

module.exports = router;
