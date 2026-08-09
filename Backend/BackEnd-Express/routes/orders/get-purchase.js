const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');


router.get('/purchase', async (req, res) => {
    const query = `
        SELECT 
            po.po_number,
            po.supplier_id,
            s.name AS supplier_name,
            po.item_code,
            po.po_date,
            po.ordered_qty_mt,
            po.status,
            po.created_by,
            po.created_at,
            COALESCE(SUM(sca.available_qty_mt), 0) AS total_allocated_mt,
            (po.ordered_qty_mt - COALESCE(SUM(sca.available_qty_mt), 0)) AS remaining_balance_mt
        FROM purchase_orders po
        INNER JOIN suppliers s ON po.supplier_id = s.id
        LEFT JOIN supplier_collection_advices sca ON po.po_number = sca.po_number
        GROUP BY 
            po.po_number,
            po.supplier_id,
            s.name,
            po.item_code,
            po.po_date,
            po.ordered_qty_mt,
            po.status,
            po.created_by,
            po.created_at
        ORDER BY po.created_at DESC;
    `;

    try {
        const { rows } = await pool.query(query);
        return res.status(200).json({
            success: true,
            purchase_orders: rows
        });
    } catch (error) {
        console.error('Failed to retrieve purchase orders dashboard:', error);
        return res.status(500).json({
            success: false,
            error: 'An internal server error occurred while retrieving the purchase orders dashboard.'
        });
    }
});

router.get('/purchase/:po_number', async (req, res) => {
    const { po_number } = req.params;
    try {
        const poResult = await pool.query(
            `SELECT 
                po.po_number,
                po.supplier_id,
                COALESCE(s.name, 'Supplier ID: ' || po.supplier_id) AS supplier_name,
                po.item_code,
                COALESCE(i.description, po.item_code) AS item_description,
                po.po_date,
                po.ordered_qty_mt::float AS ordered_qty_mt,
                po.status,
                u.username AS created_by,
                po.created_at,
                COALESCE(SUM(sca.available_qty_mt), 0)::float AS total_allocated_mt,
                (po.ordered_qty_mt - COALESCE(SUM(sca.available_qty_mt), 0))::float AS remaining_balance_mt
             FROM purchase_orders po
             LEFT JOIN suppliers s ON po.supplier_id = s.id
             LEFT JOIN items i ON i.item_code = po.item_code
             LEFT JOIN users u ON u.id = po.created_by
             LEFT JOIN supplier_collection_advices sca ON po.po_number = sca.po_number
             WHERE po.po_number = $1
             GROUP BY po.po_number, po.supplier_id, s.name, po.item_code, i.description, po.po_date, po.ordered_qty_mt, po.status, u.username, po.created_at`,
            [po_number]
        );

        if (poResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: `Purchase order '${po_number}' not found.` 
            });
        }

        const scaResult = await pool.query(
            `SELECT 
                sca.id,
                sca.supplier_ca_ref,
                sca.ca_date,
                sca.available_qty_mt::float AS available_qty_mt
             FROM supplier_collection_advices sca
             WHERE sca.po_number = $1
             ORDER BY sca.ca_date DESC`,
            [po_number]
        );

        return res.json({
            success: true,
            purchase_order: poResult.rows[0],
            supplier_collection_advices: scaResult.rows
        });
    } catch (err) {
        console.error('Purchase order detail error:', err.stack);
        return res.status(500).json({ success: false, error: 'Failed to load purchase order' });
    }
});

module.exports = router;
