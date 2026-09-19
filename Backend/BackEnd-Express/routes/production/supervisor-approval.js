const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

// GET /api/production/supervisor/pending-approval
// Fetch all production orders waiting for supervisor slot review
router.get('/supervisor/pending-approval', async (req, res) => {
    const query = `
        SELECT 
            po.id,
            po.production_order_code,
            po.so_line_id,
            sol.so_number,
            c.name AS customer_name,
            c.debtor_code,
            po.item_code,
            i.description AS item_description,
            po.handling_type,
            po.target_qty_mt::float,
            po.target_packaging,
            po.target_unit_count,
            po.scheduled_start_date,
            po.scheduled_end_date,
            po.scheduled_shift,
            po.status,
            po.created_at,
            (
                SELECT COALESCE(SUM(pma.allocated_qty_mt), 0)::float
                FROM production_material_allocations pma
                WHERE pma.production_order_id = po.id AND pma.status != 'Cancelled'
            ) AS total_allocated_mt
        FROM production_orders po
        JOIN items i ON po.item_code = i.item_code
        JOIN sales_order_lines sol ON po.so_line_id = sol.id
        JOIN sales_orders so ON sol.so_number = so.so_number
        JOIN customers c ON so.customer_id = c.id
        WHERE po.status = 'Pending_Supervisor_Approval'
        ORDER BY po.scheduled_start_date ASC, po.created_at ASC;
    `;

    try {
        const { rows } = await pool.query(query);
        return res.status(200).json({
            success: true,
            pending_orders: rows
        });
    } catch (error) {
        console.error('Failed to fetch pending approval orders:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch pending approval orders.'
        });
    }
});

// PATCH /api/production/supervisor/orders/:id/approve-slot
// Approve the scheduled slot and mark order ready for execution
router.patch('/supervisor/orders/:id/approve-slot', async (req, res) => {
    const { id } = req.params;

    try {
        const checkQuery = 'SELECT id, status FROM production_orders WHERE id = $1';
        const { rows: checkRows } = await pool.query(checkQuery, [id]);

        if (checkRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Production order not found.' });
        }

        if (checkRows[0].status !== 'Pending_Supervisor_Approval') {
            return res.status(400).json({
                success: false,
                error: 'Only orders in Pending_Supervisor_Approval status can be approved.'
            });
        }

        const updateQuery = `
            UPDATE production_orders
            SET status = 'Ready_For_Execution'
            WHERE id = $1
            RETURNING *;
        `;
        const { rows: updatedRows } = await pool.query(updateQuery, [id]);

        return res.status(200).json({
            success: true,
            message: 'Production slot approved successfully.',
            production_order: updatedRows[0]
        });
    } catch (error) {
        console.error('Failed to approve production slot:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to approve production slot.'
        });
    }
});

// PATCH /api/production/supervisor/orders/:id/reject-slot
// Reject the slot with remarks and revert order to Draft for re-planning
router.patch('/supervisor/orders/:id/reject-slot', async (req, res) => {
    const { id } = req.params;
    const { supervisor_remarks } = req.body;

    if (!supervisor_remarks || supervisor_remarks.trim() === '') {
        return res.status(400).json({
            success: false,
            error: 'Supervisor remarks are required when rejecting a slot.'
        });
    }

    try {
        const checkQuery = 'SELECT id, status FROM production_orders WHERE id = $1';
        const { rows: checkRows } = await pool.query(checkQuery, [id]);

        if (checkRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Production order not found.' });
        }

        if (checkRows[0].status !== 'Pending_Supervisor_Approval') {
            return res.status(400).json({
                success: false,
                error: 'Only orders in Pending_Supervisor_Approval status can be rejected.'
            });
        }

        const updateQuery = `
            UPDATE production_orders
            SET status = 'Draft', supervisor_remarks = $1
            WHERE id = $2
            RETURNING *;
        `;
        const { rows: updatedRows } = await pool.query(updateQuery, [supervisor_remarks.trim(), id]);

        return res.status(200).json({
            success: true,
            message: 'Production slot rejected. Order reverted to Draft.',
            production_order: updatedRows[0]
        });
    } catch (error) {
        console.error('Failed to reject production slot:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to reject production slot.'
        });
    }
});

module.exports = router;