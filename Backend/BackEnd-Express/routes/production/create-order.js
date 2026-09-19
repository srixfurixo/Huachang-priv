const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

// POST /api/production/create-order
// Step 1: Creates the master Production Order header in 'Draft'
router.post(['/production/create-order', '/create-order'], async (req, res) => {
    const {
        production_order_code,
        so_line_id,
        item_code,
        handling_type,
        target_qty_mt,
        target_packaging,
        target_unit_count,
        scheduled_start_date,
        scheduled_end_date,
        scheduled_shift,
        recipe_instructions
    } = req.body;

    const created_by = req.user.id;

    if (!production_order_code || !so_line_id || !item_code || !handling_type || !target_qty_mt || !target_packaging || !scheduled_start_date) {
        return res.status(400).json({
            success: false,
            error: 'Missing mandatory fields for production order creation.'
        });
    }

    try {
        // Prevent duplicate production order code
        const dupCheck = await pool.query('SELECT 1 FROM production_orders WHERE production_order_code = $1', [production_order_code]);
        if (dupCheck.rows.length > 0) {
            return res.status(400).json({ success: false, error: `Production order code '${production_order_code}' already exists.` });
        }

        // Ensure SO line doesn't already have an active production order
        const lineCheck = await pool.query('SELECT 1 FROM production_orders WHERE so_line_id = $1 AND status != $2', [so_line_id, 'Cancelled']);
        if (lineCheck.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'This sales order line already has an active production order.' });
        }

        const insertQuery = `
            INSERT INTO production_orders (
                production_order_code,
                so_line_id,
                item_code,
                handling_type,
                target_qty_mt,
                target_packaging,
                target_unit_count,
                scheduled_start_date,
                scheduled_end_date,
                scheduled_shift,
                status,
                recipe_instructions,
                created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Draft', $11, $12)
            RETURNING *;
        `;

        const values = [
            production_order_code,
            so_line_id,
            item_code,
            handling_type,
            Number(target_qty_mt),
            target_packaging,
            parseInt(target_unit_count, 10) || 0,
            scheduled_start_date,
            scheduled_end_date || null,
            scheduled_shift || 'Morning',
            recipe_instructions || null,
            created_by
        ];

        const { rows } = await pool.query(insertQuery, values);

        return res.status(201).json({
            success: true,
            message: 'Production order header created successfully. Proceed to allocate materials.',
            production_order: rows[0]
        });

    } catch (error) {
        console.error('Create production order error:', error);
        return res.status(500).json({ success: false, error: 'Failed to create production order.' });
    }
});

module.exports = router;