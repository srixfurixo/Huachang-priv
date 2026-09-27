const express = require('express');
const router = express.Router();
const pool = require('../Static/db_main');

// Endpoint to fetch all open Purchase Order lines with remaining unreleased tonnage
router.get('/open-po-lines', async (req, res) => {
    try {
        // Query open purchase order lines joined with purchase orders, suppliers, and items
        const query = `
            SELECT 
                pol.id AS po_line_id,
                pol.po_number,
                po.po_date,
                s.id AS supplier_id,
                s.name AS supplier_name,
                pol.item_code,
                i.description AS item_description,
                i.uom,
                pol.ordered_qty_mt::float AS ordered_qty_mt,
                COALESCE(sca_sum.total_released, 0)::float AS total_released_mt,
                (pol.ordered_qty_mt - COALESCE(sca_sum.total_released, 0))::float AS remaining_to_release_mt,
                pol.status AS line_status
            FROM purchase_order_lines pol
            JOIN purchase_orders po ON pol.po_number = po.po_number
            JOIN suppliers s ON po.supplier_id = s.id
            JOIN items i ON pol.item_code = i.item_code
            LEFT JOIN (
                SELECT 
                    po_line_id, 
                    SUM(available_qty_mt) AS total_released
                FROM supplier_collection_advices
                GROUP BY po_line_id
            ) sca_sum ON sca_sum.po_line_id = pol.id
            WHERE po.status != 'Cancelled'
              AND (pol.ordered_qty_mt - COALESCE(sca_sum.total_released, 0)) > 0
            ORDER BY po.po_date DESC, pol.id DESC;
        `;

        const result = await pool.query(query);
        const rows = result.rows;

        // Return HTTP 200 response with list and count
        return res.status(200).json({
            success: true,
            count: rows.length,
            open_po_lines: rows
        });
    } catch (error) {
        // Log query error and return standard 500 error response
        console.error('Failed to fetch open PO lines:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve open purchase order lines.'
        });
    }
});

module.exports = router;
