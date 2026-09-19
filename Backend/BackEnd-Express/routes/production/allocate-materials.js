const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

// POST /api/production/allocate-materials
// Step 2: Reserves raw materials and moves order to 'Pending_Supervisor_Approval'
router.post(['/production/allocate-materials', '/allocate-materials'], async (req, res) => {
    const { production_order_id, allocations } = req.body;

    if (!production_order_id || !Array.isArray(allocations) || allocations.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: production_order_id and non-empty allocations array are required.'
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if production order exists and is in Draft
        const poResult = await client.query('SELECT id, so_line_id, status FROM production_orders WHERE id = $1', [production_order_id]);
        if (poResult.rows.length === 0) {
            const error = new Error('Production order not found.');
            error.statusCode = 404;
            throw error;
        }

        const po = poResult.rows[0];
        if (po.status !== 'Draft') {
            const error = new Error(`Cannot allocate materials. Order is in '${po.status}' status.`);
            error.statusCode = 400;
            throw error;
        }

        const insertedAllocations = [];

        // Insert material allocations
        for (const item of allocations) {
            const qty = Number(item.allocated_qty_mt);
            if (!item.raw_item_code || !item.source_type || !item.source_ref || isNaN(qty) || qty <= 0) {
                const error = new Error('Invalid raw material allocation entry.');
                error.statusCode = 400;
                throw error;
            }

            const insertAllocQuery = `
                INSERT INTO production_material_allocations (
                    production_order_id,
                    raw_item_code,
                    source_type,
                    source_ref,
                    allocated_qty_mt,
                    status
                ) VALUES ($1, $2, $3, $4, $5, 'Reserved')
                RETURNING *;
            `;

            const allocResult = await client.query(insertAllocQuery, [
                production_order_id,
                item.raw_item_code,
                item.source_type,
                item.source_ref,
                qty
            ]);
            insertedAllocations.push(allocResult.rows[0]);
        }

        // Advance Production Order to Pending_Supervisor_Approval
        await client.query(
            "UPDATE production_orders SET status = 'Pending_Supervisor_Approval' WHERE id = $1",
            [production_order_id]
        );

        // Advance linked SO Line to In_Production
        await client.query(
            "UPDATE sales_order_lines SET status = 'In_Production' WHERE id = $1",
            [po.so_line_id]
        );

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Raw materials successfully allocated and order submitted for supervisor approval.',
            allocations: insertedAllocations
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Allocate materials error:', error);
        return res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Failed to allocate raw materials.'
        });
    } finally {
        client.release();
    }
});

module.exports = router;