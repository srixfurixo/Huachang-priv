const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

router.get('/orders', async (req, res) => {
    const { status, handling_type, scheduled_shift, start_date, end_date } = req.query;
    const conditions = [];
    const values = [];

    if (status) {
        values.push(status);
        conditions.push(`po.status = $${values.length}`);
    }

    if (handling_type) {
        values.push(handling_type);
        conditions.push(`po.handling_type = $${values.length}`);
    }

    if (scheduled_shift) {
        values.push(scheduled_shift);
        conditions.push(`po.scheduled_shift = $${values.length}`);
    }

    if (start_date) {
        values.push(start_date);
        conditions.push(`po.scheduled_start_date >= $${values.length}::date`);
    }

    if (end_date) {
        values.push(end_date);
        conditions.push(`po.scheduled_start_date <= $${values.length}::date`);
    }

    let whereClause = '';
    if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

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
            ) AS total_allocated_mt,
            (
                SELECT COALESCE(SUM(ppl.tonnage_processed), 0)::float
                FROM production_progress_logs ppl
                WHERE ppl.production_order_id = po.id
            ) AS total_processed_mt
        FROM production_orders po
        JOIN items i ON po.item_code = i.item_code
        JOIN sales_order_lines sol ON po.so_line_id = sol.id
        JOIN sales_orders so ON sol.so_number = so.so_number
        JOIN customers c ON so.customer_id = c.id
        ${whereClause}
        ORDER BY po.scheduled_start_date DESC, po.created_at DESC;
    `;

    try {
        const { rows } = await pool.query(query, values);
        return res.status(200).json({ success: true, production_orders: rows });
    } catch (error) {
        console.error('Failed to fetch production orders:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch production orders.' });
    }
});

router.get('/orders/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const queryA = pool.query(
            `SELECT
                po.*,
                i.description AS item_description,
                i.uom,
                sol.so_number,
                sol.ordered_qty_mt::float AS so_ordered_qty_mt,
                sol.packaging_kg::float AS so_packaging_kg,
                sol.no_of_bags AS so_no_of_bags,
                sol.estimated_delivery_date,
                c.name AS customer_name,
                c.debtor_code,
                u.username AS created_by_username
            FROM production_orders po
            JOIN items i ON po.item_code = i.item_code
            JOIN sales_order_lines sol ON po.so_line_id = sol.id
            JOIN sales_orders so ON sol.so_number = so.so_number
            JOIN customers c ON so.customer_id = c.id
            LEFT JOIN users u ON po.created_by = u.id
            WHERE po.id = $1`,
            [id]
        );

        const queryB = pool.query(
            `SELECT
                pma.id,
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
            ORDER BY pma.id ASC`,
            [id]
        );

        const queryC = pool.query(
            `SELECT
                pa.id,
                pa.worker_id,
                u.username,
                u.first_name,
                u.last_name,
                pa.slot_date,
                pa.shift_name,
                pa.role_in_production,
                pa.assigned_at
            FROM production_assignments pa
            JOIN users u ON pa.worker_id = u.id
            WHERE pa.production_order_id = $1
            ORDER BY pa.slot_date ASC, pa.shift_name ASC`,
            [id]
        );

        const queryD = pool.query(
            `SELECT
                ppl.id,
                ppl.stage_name,
                ppl.shift_date,
                ppl.shift_name,
                ppl.tonnage_processed::float,
                ppl.units_packed,
                ppl.waste_kg::float,
                ppl.remarks,
                u.username AS logged_by_username,
                ppl.created_at
            FROM production_progress_logs ppl
            LEFT JOIN users u ON ppl.logged_by = u.id
            WHERE ppl.production_order_id = $1
            ORDER BY ppl.created_at ASC`,
            [id]
        );

        const queryE = pool.query(
            `SELECT
                ptc.id,
                ptc.task_name,
                ptc.is_completed,
                u.username AS completed_by_username,
                ptc.completed_at
            FROM production_task_checklists ptc
            LEFT JOIN users u ON ptc.completed_by = u.id
            WHERE ptc.production_order_id = $1
            ORDER BY ptc.id ASC`,
            [id]
        );

        const [resA, resB, resC, resD, resE] = await Promise.all([queryA, queryB, queryC, queryD, queryE]);

        if (resA.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Production order not found.' });
        }

        return res.status(200).json({
            success: true,
            production_order: resA.rows[0],
            material_allocations: resB.rows,
            worker_assignments: resC.rows,
            progress_logs: resD.rows,
            checklists: resE.rows
        });
    } catch (error) {
        console.error('Failed to fetch production order detail:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch production order detail.' });
    }
});

router.patch('/orders/:id', async (req, res) => {
    const { id } = req.params;
    const {
        target_packaging,
        target_unit_count,
        scheduled_start_date,
        scheduled_end_date,
        scheduled_shift,
        recipe_instructions,
        supervisor_remarks
    } = req.body;

    try {
        const orderCheck = await pool.query('SELECT id, status FROM production_orders WHERE id = $1', [id]);

        if (orderCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Production order not found.' });
        }

        const currentStatus = orderCheck.rows[0].status;
        if (!['Draft', 'Pending_Supervisor_Approval'].includes(currentStatus)) {
            return res.status(400).json({ success: false, error: 'Cannot update order in current status.' });
        }

        const updates = [];
        const values = [];

        if (target_packaging !== undefined) {
            values.push(target_packaging);
            updates.push(`target_packaging = $${values.length}`);
        }

        if (target_unit_count !== undefined) {
            values.push(target_unit_count);
            updates.push(`target_unit_count = $${values.length}`);
        }

        if (scheduled_start_date !== undefined) {
            values.push(scheduled_start_date);
            updates.push(`scheduled_start_date = $${values.length}`);
        }

        if (scheduled_end_date !== undefined) {
            values.push(scheduled_end_date);
            updates.push(`scheduled_end_date = $${values.length}`);
        }

        if (scheduled_shift !== undefined) {
            values.push(scheduled_shift);
            updates.push(`scheduled_shift = $${values.length}`);
        }

        if (recipe_instructions !== undefined) {
            values.push(recipe_instructions);
            updates.push(`recipe_instructions = $${values.length}`);
        }

        if (supervisor_remarks !== undefined) {
            values.push(supervisor_remarks);
            updates.push(`supervisor_remarks = $${values.length}`);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields provided to update.' });
        }

        values.push(id);
        const updateQuery = `
            UPDATE production_orders
            SET ${updates.join(', ')}
            WHERE id = $${values.length}
            RETURNING *;
        `;

        const { rows } = await pool.query(updateQuery, values);
        return res.status(200).json({
            success: true,
            message: 'Production order updated successfully.',
            production_order: rows[0]
        });
    } catch (error) {
        console.error('Failed to update production order:', error);
        return res.status(500).json({ success: false, error: 'Failed to update production order.' });
    }
});

router.patch('/orders/:id/cancel', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const orderCheck = await client.query(
            'SELECT id, so_line_id, status FROM production_orders WHERE id = $1 FOR UPDATE',
            [id]
        );

        if (orderCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Production order not found.' });
        }

        const { so_line_id, status } = orderCheck.rows[0];

        if (['Completed', 'Cancelled'].includes(status)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'Order cannot be cancelled.' });
        }

        await client.query("UPDATE production_orders SET status = 'Cancelled' WHERE id = $1", [id]);
        await client.query("UPDATE production_material_allocations SET status = 'Cancelled' WHERE production_order_id = $1", [id]);
        await client.query("UPDATE sales_order_lines SET status = 'Pending' WHERE id = $1", [so_line_id]);

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: 'Production order cancelled and raw material allocations released.'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to cancel production order:', error);
        return res.status(500).json({ success: false, error: 'Failed to cancel production order.' });
    } finally {
        client.release();
    }
});

module.exports = router;
