const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

router.get('/get-sales', async (req, res) => {
    const query = `
        SELECT 
            so.so_number,
            so.customer_id,
            c.name AS customer_name,
            so.item_code,
            so.so_date,
            so.ordered_qty_mt,
            so.status,
            so.created_at
        FROM sales_orders so
        INNER JOIN customers c ON so.customer_id = c.id
        ORDER BY so.created_at DESC;
    `;

    try {
        const { rows } = await pool.query(query);
        return res.status(200).json({
            success: true,
            sales_orders: rows
        });
    } catch (error) {
        console.error('Failed to retrieve sales orders dashboard:', error);
        return res.status(500).json({
            success: false,
            error: 'An internal server error occurred while retrieving the sales orders dashboard.'
        });
    }
});

router.get('/sales/:so_number', async (req, res) => {
    const { so_number } = req.params;
    try {
        const soResult = await pool.query(
            `SELECT 
                so.so_number,
                so.customer_id,
                c.debtor_code,
                COALESCE(c.name, 'Customer ID: ' || so.customer_id) AS customer_name,
                so.item_code,
                COALESCE(i.description, so.item_code) AS item_description,
                so.so_date,
                so.ordered_qty_mt::float AS ordered_qty_mt,
                so.status,
                u.username AS created_by,
                so.created_at
             FROM sales_orders so
             LEFT JOIN customers c ON so.customer_id = c.id
             LEFT JOIN items i ON i.item_code = so.item_code
             LEFT JOIN users u ON u.id = so.created_by
             WHERE so.so_number = $1`,
            [so_number]
        );

        if (soResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: `Sales order '${so_number}' not found.` 
            });
        }

        const allocationsResult = await pool.query(
            `SELECT 
                a.id,
                a.allocated_qty_mt::float AS allocated_qty_mt,
                a.source_type,
                a.source_ref,
                a.status,
                a.created_at
             FROM sales_order_allocations a
             WHERE a.so_number = $1 AND a.status != 'Cancelled'
             ORDER BY a.created_at DESC`,
            [so_number]
        );

        return res.json({
            success: true,
            sales_order: soResult.rows[0],
            allocations: allocationsResult.rows
        });
    } catch (err) {
        console.error('Sales order detail error:', err.stack);
        return res.status(500).json({ success: false, error: 'Failed to load sales order' });
    }
});

module.exports = router;
