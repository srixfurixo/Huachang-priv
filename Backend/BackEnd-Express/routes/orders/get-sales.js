const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

// 1. Dashboard summary listing of all Sales Orders
router.get('/get-sales', async (req, res) => {
    const query = `
        SELECT 
            so.so_number,
            so.customer_id,
            c.debtor_code,
            c.name AS customer_name,
            so.so_date,
            so.customer_ref_no,
            so.sales_agent,
            so.ship_via,
            so.status,
            COALESCE(STRING_AGG(DISTINCT sol.item_code, ', ' ORDER BY sol.item_code), 'No Items') AS item_code,
            COALESCE(SUM(sol.ordered_qty_mt), 0)::float AS ordered_qty_mt,
            COALESCE(SUM(sol.ordered_qty_mt), 0)::float AS total_ordered_qty_mt,
            COALESCE(SUM(sol.no_of_bags), 0)::int AS total_no_of_bags,
            COUNT(sol.id)::int AS total_line_items,
            so.remarks,
            so.created_at
        FROM sales_orders so
        INNER JOIN customers c ON so.customer_id = c.id
        LEFT JOIN sales_order_lines sol ON sol.so_number = so.so_number
        GROUP BY 
            so.so_number, 
            so.customer_id, 
            c.debtor_code, 
            c.name, 
            so.so_date, 
            so.customer_ref_no, 
            so.sales_agent, 
            so.ship_via, 
            so.status, 
            so.remarks, 
            so.created_at
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

// 2. Master-Detail lookup for a specific Sales Order
router.get('/sales/:so_number', async (req, res) => {
    const { so_number } = req.params;

    try {
        // A. Header Information
        const soResult = await pool.query(
            `SELECT 
                so.so_number,
                so.customer_id,
                c.debtor_code,
                COALESCE(c.name, 'Customer ID: ' || so.customer_id) AS customer_name,
                so.so_date,
                so.customer_ref_no,
                so.sales_agent,
                so.ship_via,
                so.remarks,
                so.status,
                u.username AS created_by,
                so.created_at
             FROM sales_orders so
             LEFT JOIN customers c ON so.customer_id = c.id
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

        // B. All Line Items with Item Master metadata & Production Order linkage
        const linesResult = await pool.query(
            `SELECT 
                sol.id AS so_line_id,
                sol.item_code,
                i.description AS item_description,
                i.uom,
                sol.ordered_qty_mt::float AS ordered_qty_mt,
                sol.packaging_kg::float AS packaging_kg,
                sol.no_of_bags,
                sol.estimated_delivery_date,
                sol.status AS line_status,
                i.can_be_produced,
                i.can_be_sold,
                po.id AS production_order_id,
                po.production_order_code,
                po.status AS production_status,
                po.handling_type
             FROM sales_order_lines sol
             JOIN items i ON i.item_code = sol.item_code
             LEFT JOIN production_orders po ON po.so_line_id = sol.id
             WHERE sol.so_number = $1
             ORDER BY sol.id ASC`,
            [so_number]
        );

        // C. All Line-Level Stock Allocations
        const allocationsResult = await pool.query(
            `SELECT 
                a.id,
                a.so_line_id,
                sol.item_code,
                a.allocated_qty_mt::float AS allocated_qty_mt,
                a.source_type,
                a.source_ref,
                a.status,
                a.created_at
             FROM sales_order_allocations a
             JOIN sales_order_lines sol ON sol.id = a.so_line_id
             WHERE sol.so_number = $1 AND a.status != 'Cancelled'
             ORDER BY a.created_at DESC`,
            [so_number]
        );

        return res.status(200).json({
            success: true,
            sales_order: soResult.rows[0],
            line_items: linesResult.rows,
            allocations: allocationsResult.rows
        });
    } catch (err) {
        console.error('Sales order detail error:', err.stack);
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to load sales order details.' 
        });
    }
});

module.exports = router;