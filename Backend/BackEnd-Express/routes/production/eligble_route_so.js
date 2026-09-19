const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');


// This is the route that is for retrieving all of the active routes that have no production or they created for them. 
router.get(['/production/eligible-lines', '/eligible-lines'], async (req, res) => {
    const query = `
        SELECT 
            sol.id AS so_line_id,
            sol.so_number,
            so.so_date,
            so.customer_id,
            c.debtor_code,
            c.name AS customer_name,
            sol.item_code,
            i.description AS item_description,
            i.uom,
            sol.ordered_qty_mt::float AS ordered_qty_mt,
            sol.packaging_kg::float AS packaging_kg,
            sol.no_of_bags,
            sol.estimated_delivery_date,
            sol.status AS line_status,
            so.remarks AS sales_order_remarks
        FROM sales_order_lines sol
        INNER JOIN sales_orders so ON sol.so_number = so.so_number
        INNER JOIN customers c ON so.customer_id = c.id
        INNER JOIN items i ON sol.item_code = i.item_code
        LEFT JOIN production_orders po ON po.so_line_id = sol.id
        WHERE i.can_be_produced = TRUE
          AND sol.status = 'Pending'
          AND (po.id IS NULL OR po.status = 'Cancelled')
        ORDER BY sol.estimated_delivery_date ASC NULLS LAST, so.so_date ASC; 
    `;

    try {
        const { rows } = await pool.query(query);
        return res.status(200).json({
            success: true,
            eligible_lines: rows
        });
    } catch (error) {
        console.error('Failed to retrieve eligible production lines:', error);
        return res.status(500).json({
            success: false,
            error: 'An internal server error occurred while retrieving eligible production lines.'
        });
    }
});

module.exports = router;