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

// Dedicated route to compute progress across all execution phases for a production order
router.get('/orders/:id/progress', async (req, res) => {
    const { id } = req.params;

    // Validate that order ID is a valid positive integer
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid production order ID.'
        });
    }

    try {
        // Query order header, raw material allocations, and progress logs
        const orderQuery = `
            SELECT id, production_order_code, handling_type, target_qty_mt, target_unit_count, status
            FROM production_orders
            WHERE id = $1;
        `;
        const allocationsQuery = `
            SELECT allocated_qty_mt, actual_retrieved_mt
            FROM production_material_allocations
            WHERE production_order_id = $1 AND status != 'Cancelled';
        `;
        const logsQuery = `
            SELECT stage_name, tonnage_processed, units_packed
            FROM production_progress_logs
            WHERE production_order_id = $1;
        `;

        const [orderResult, allocationsResult, logsResult] = await Promise.all([
            pool.query(orderQuery, [orderId]),
            pool.query(allocationsQuery, [orderId]),
            pool.query(logsQuery, [orderId])
        ]);

        if (orderResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Production order not found.'
            });
        }

        const order = orderResult.rows[0];
        const allocations = allocationsResult.rows;
        const logs = logsResult.rows;

        // Step 1: Material Retrieval Calculation
        let total_needed_mt = 0;
        let total_retrieved_mt = 0;
        for (let i = 0; i < allocations.length; i++) {
            const row = allocations[i];
            total_needed_mt = total_needed_mt + (Number(row.allocated_qty_mt) || 0);
            total_retrieved_mt = total_retrieved_mt + (Number(row.actual_retrieved_mt) || 0);
        }

        let step1Percentage = 0;
        if (total_needed_mt > 0) {
            step1Percentage = Math.round((total_retrieved_mt / total_needed_mt) * 100);
        }
        if (step1Percentage > 100) {
            step1Percentage = 100;
        }
        const step1Completed = Boolean(total_needed_mt > 0 && total_retrieved_mt >= total_needed_mt);

        // Step 2: Processing / Mixing Calculation
        const target_qty_mt = Number(order.target_qty_mt) || 0;
        let total_mixed_mt = 0;
        for (let i = 0; i < logs.length; i++) {
            const log = logs[i];
            if (log.stage_name === 'Mixing') {
                total_mixed_mt = total_mixed_mt + (Number(log.tonnage_processed) || 0);
            }
        }

        let step2Percentage = 0;
        if (target_qty_mt > 0) {
            step2Percentage = Math.round((total_mixed_mt / target_qty_mt) * 100);
        }
        if (step2Percentage > 100) {
            step2Percentage = 100;
        }
        const step2Completed = Boolean(target_qty_mt > 0 && total_mixed_mt >= target_qty_mt);

        // Step 3: Output / Packaging Calculation
        const target_unit_count = Number(order.target_unit_count) || 0;
        let total_packed_mt = 0;
        let total_packed_units = 0;
        for (let i = 0; i < logs.length; i++) {
            const log = logs[i];
            if (log.stage_name === 'Packaging') {
                total_packed_mt = total_packed_mt + (Number(log.tonnage_processed) || 0);
                total_packed_units = total_packed_units + (Number(log.units_packed) || 0);
            }
        }

        let step3Percentage = 0;
        if (target_qty_mt > 0) {
            step3Percentage = Math.round((total_packed_mt / target_qty_mt) * 100);
        }
        if (step3Percentage > 100) {
            step3Percentage = 100;
        }
        const step3Completed = Boolean(target_qty_mt > 0 && total_packed_mt >= target_qty_mt);

        // Overall Progress & Stage Detection
        let overallPercentage = 0;
        if (order.handling_type === 'Repacking') {
            // 2-step flow: only materials and packaging
            overallPercentage = Math.round((step1Percentage + step3Percentage) / 2);
        } else {
            // 3-step flow: materials, mixing, packaging
            overallPercentage = Math.round((step1Percentage + step2Percentage + step3Percentage) / 3);
        }

        let currentStage = 'RAW_MATERIALS';
        if (order.handling_type === 'Repacking') {
            if (!step1Completed) {
                currentStage = 'RAW_MATERIALS';
            } else if (!step3Completed) {
                currentStage = 'PACKAGING';
            } else {
                currentStage = 'COMPLETED';
            }
        } else {
            if (!step1Completed) {
                currentStage = 'RAW_MATERIALS';
            } else if (!step2Completed) {
                currentStage = 'PROCESSING';
            } else if (!step3Completed) {
                currentStage = 'PACKAGING';
            } else {
                currentStage = 'COMPLETED';
            }
        }

        // Return structured progress response
        return res.status(200).json({
            success: true,
            production_order_id: order.id,
            production_order_code: order.production_order_code,
            status: order.status,
            progress: {
                overall_percentage: overallPercentage,
                current_stage: currentStage,
                step_1_materials: {
                    needed_mt: Number(total_needed_mt.toFixed(3)),
                    retrieved_mt: Number(total_retrieved_mt.toFixed(3)),
                    percentage: step1Percentage,
                    is_completed: step1Completed
                },
                step_2_processing: {
                    handling_type: order.handling_type,
                    target_mt: Number(target_qty_mt.toFixed(3)),
                    processed_mt: Number(total_mixed_mt.toFixed(3)),
                    percentage: step2Percentage,
                    is_completed: step2Completed
                },
                step_3_output: {
                    target_mt: Number(target_qty_mt.toFixed(3)),
                    packed_mt: Number(total_packed_mt.toFixed(3)),
                    target_units: target_unit_count,
                    packed_units: total_packed_units,
                    percentage: step3Percentage,
                    is_completed: step3Completed
                }
            }
        });
    } catch (error) {
        console.error('Failed to compute production order progress:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to calculate production order progress.'
        });
    }
});

// Dedicated route to fetch all operational execution details and calculated progress
router.get('/orders/:id/execution-details', async (req, res) => {
    const { id } = req.params;

    // Validate that order ID is a valid positive integer
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid production order ID.'
        });
    }

    try {
        // Query 1: Fetch core order header details
        const orderQuery = `
            SELECT
                po.id,
                po.production_order_code,
                po.so_line_id,
                sol.so_number,
                c.name AS customer_name,
                c.debtor_code,
                po.item_code,
                i.description AS item_description,
                i.uom,
                po.handling_type,
                po.target_qty_mt,
                po.target_packaging,
                po.target_unit_count,
                po.recipe_instructions,
                po.scheduled_start_date,
                po.scheduled_end_date,
                po.scheduled_shift,
                po.status,
                po.created_at
            FROM production_orders po
            JOIN items i ON po.item_code = i.item_code
            JOIN sales_order_lines sol ON po.so_line_id = sol.id
            JOIN sales_orders so ON sol.so_number = so.so_number
            JOIN customers c ON so.customer_id = c.id
            WHERE po.id = $1;
        `;

        // Query 2: Fetch raw material allocations for Tab 1
        const allocationsQuery = `
            SELECT
                pma.id,
                pma.raw_item_code,
                i.description AS raw_item_description,
                pma.source_type,
                pma.source_ref,
                pma.allocated_qty_mt,
                pma.actual_retrieved_mt,
                pma.status,
                pma.retrieved_at,
                u.username AS retrieved_by_username
            FROM production_material_allocations pma
            JOIN items i ON pma.raw_item_code = i.item_code
            LEFT JOIN users u ON pma.retrieved_by = u.id
            WHERE pma.production_order_id = $1 AND pma.status != 'Cancelled'
            ORDER BY pma.id ASC;
        `;

        // Query 3: Fetch shift progress history for Tab 2 and Tab 3
        const logsQuery = `
            SELECT
                ppl.id,
                ppl.stage_name,
                ppl.shift_date,
                ppl.shift_name,
                ppl.tonnage_processed,
                ppl.units_packed,
                ppl.waste_kg,
                ppl.remarks,
                u.username AS logged_by_username,
                ppl.created_at
            FROM production_progress_logs ppl
            LEFT JOIN users u ON ppl.logged_by = u.id
            WHERE ppl.production_order_id = $1
            ORDER BY ppl.created_at ASC;
        `;

        const [orderResult, allocationsResult, logsResult] = await Promise.all([
            pool.query(orderQuery, [orderId]),
            pool.query(allocationsQuery, [orderId]),
            pool.query(logsQuery, [orderId])
        ]);

        if (orderResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Production order not found.'
            });
        }

        const order = orderResult.rows[0];
        const raw_materials = allocationsResult.rows;
        const progress_logs = logsResult.rows;

        // Step 1: Raw Materials Retrieval Calculation
        let total_needed_mt = 0;
        let total_retrieved_mt = 0;
        for (let i = 0; i < raw_materials.length; i++) {
            const row = raw_materials[i];
            total_needed_mt = total_needed_mt + (Number(row.allocated_qty_mt) || 0);
            total_retrieved_mt = total_retrieved_mt + (Number(row.actual_retrieved_mt) || 0);
        }

        let step1Percentage = 0;
        if (total_needed_mt > 0) {
            step1Percentage = Math.round((total_retrieved_mt / total_needed_mt) * 100);
        }
        if (step1Percentage > 100) {
            step1Percentage = 100;
        }
        const step1Completed = Boolean(total_needed_mt > 0 && total_retrieved_mt >= total_needed_mt);

        // Step 2: Processing / Mixing Calculation
        const target_qty_mt = Number(order.target_qty_mt) || 0;
        let total_mixed_mt = 0;
        for (let i = 0; i < progress_logs.length; i++) {
            const log = progress_logs[i];
            if (log.stage_name === 'Mixing') {
                total_mixed_mt = total_mixed_mt + (Number(log.tonnage_processed) || 0);
            }
        }

        let step2Percentage = 0;
        if (target_qty_mt > 0) {
            step2Percentage = Math.round((total_mixed_mt / target_qty_mt) * 100);
        }
        if (step2Percentage > 100) {
            step2Percentage = 100;
        }
        const step2Completed = Boolean(target_qty_mt > 0 && total_mixed_mt >= target_qty_mt);

        // Step 3: Packaging / Output Calculation
        const target_unit_count = Number(order.target_unit_count) || 0;
        let total_packed_mt = 0;
        let total_packed_units = 0;
        for (let i = 0; i < progress_logs.length; i++) {
            const log = progress_logs[i];
            if (log.stage_name === 'Packaging') {
                total_packed_mt = total_packed_mt + (Number(log.tonnage_processed) || 0);
                total_packed_units = total_packed_units + (Number(log.units_packed) || 0);
            }
        }

        let step3Percentage = 0;
        if (target_qty_mt > 0) {
            step3Percentage = Math.round((total_packed_mt / target_qty_mt) * 100);
        }
        if (step3Percentage > 100) {
            step3Percentage = 100;
        }
        const step3Completed = Boolean(target_qty_mt > 0 && total_packed_mt >= target_qty_mt);

        // Overall Percentage & Current Operational Stage
        let overallPercentage = 0;
        if (order.handling_type === 'Repacking') {
            // 2-step flow: only materials and packaging
            overallPercentage = Math.round((step1Percentage + step3Percentage) / 2);
        } else {
            // 3-step flow: materials, mixing, packaging
            overallPercentage = Math.round((step1Percentage + step2Percentage + step3Percentage) / 3);
        }

        let currentStage = 'RAW_MATERIALS';
        if (order.handling_type === 'Repacking') {
            if (!step1Completed) {
                currentStage = 'RAW_MATERIALS';
            } else if (!step3Completed) {
                currentStage = 'PACKAGING';
            } else {
                currentStage = 'COMPLETED';
            }
        } else {
            if (!step1Completed) {
                currentStage = 'RAW_MATERIALS';
            } else if (!step2Completed) {
                currentStage = 'PROCESSING';
            } else if (!step3Completed) {
                currentStage = 'PACKAGING';
            } else {
                currentStage = 'COMPLETED';
            }
        }

        // Format order details explicitly without shorthand
        const formattedOrder = {
            id: order.id,
            production_order_code: order.production_order_code,
            so_number: order.so_number,
            customer_name: order.customer_name,
            debtor_code: order.debtor_code,
            item_code: order.item_code,
            item_description: order.item_description,
            handling_type: order.handling_type,
            target_qty_mt: Number(target_qty_mt.toFixed(3)),
            target_packaging: order.target_packaging,
            target_unit_count: target_unit_count,
            recipe_instructions: order.recipe_instructions,
            scheduled_start_date: order.scheduled_start_date,
            scheduled_end_date: order.scheduled_end_date,
            scheduled_shift: order.scheduled_shift,
            status: order.status
        };

        // Format raw material allocation rows explicitly
        const formattedRawMaterials = [];
        for (let i = 0; i < raw_materials.length; i++) {
            const mat = raw_materials[i];
            formattedRawMaterials.push({
                id: mat.id,
                raw_item_code: mat.raw_item_code,
                raw_item_description: mat.raw_item_description,
                source_type: mat.source_type,
                source_ref: mat.source_ref,
                allocated_qty_mt: Number(Number(mat.allocated_qty_mt || 0).toFixed(3)),
                actual_retrieved_mt: Number(Number(mat.actual_retrieved_mt || 0).toFixed(3)),
                status: mat.status,
                retrieved_at: mat.retrieved_at,
                retrieved_by_username: mat.retrieved_by_username
            });
        }

        // Format shift progress history rows explicitly
        const formattedProgressLogs = [];
        for (let i = 0; i < progress_logs.length; i++) {
            const log = progress_logs[i];
            formattedProgressLogs.push({
                id: log.id,
                stage_name: log.stage_name,
                shift_date: log.shift_date,
                shift_name: log.shift_name,
                tonnage_processed: Number(Number(log.tonnage_processed || 0).toFixed(3)),
                units_packed: Number(log.units_packed) || 0,
                waste_kg: Number(Number(log.waste_kg || 0).toFixed(3)),
                remarks: log.remarks,
                logged_by_username: log.logged_by_username,
                created_at: log.created_at
            });
        }

        // Return consolidated execution details payload
        return res.status(200).json({
            success: true,
            order: formattedOrder,
            raw_materials: formattedRawMaterials,
            progress_logs: formattedProgressLogs,
            progress: {
                overall_percentage: overallPercentage,
                current_stage: currentStage,
                step_1_materials: {
                    needed_mt: Number(total_needed_mt.toFixed(3)),
                    retrieved_mt: Number(total_retrieved_mt.toFixed(3)),
                    percentage: step1Percentage,
                    is_completed: step1Completed
                },
                step_2_processing: {
                    handling_type: order.handling_type,
                    target_mt: Number(target_qty_mt.toFixed(3)),
                    processed_mt: Number(total_mixed_mt.toFixed(3)),
                    percentage: step2Percentage,
                    is_completed: step2Completed
                },
                step_3_output: {
                    target_mt: Number(target_qty_mt.toFixed(3)),
                    packed_mt: Number(total_packed_mt.toFixed(3)),
                    target_units: target_unit_count,
                    packed_units: total_packed_units,
                    percentage: step3Percentage,
                    is_completed: step3Completed
                }
            }
        });
    } catch (error) {
        console.error('Failed to fetch production execution details:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve production execution details.'
        });
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
