const express = require('express');
const router = express.Router();
const pool = require('../Static/db_main');

router.get('/active-supplier-cas', async function (req, res) {
    try {
        let whereItemCondition = '';
        const queryParams = [];

        if (req.query.item_code) {
            queryParams.push(req.query.item_code);
            whereItemCondition = 'AND pol.item_code = $1';
        }

        const query = `
            SELECT
                sca.id AS supplier_ca_id,
                sca.supplier_ca_ref,
                sca.ca_date,
                sca.available_qty_mt::float,
                pol.po_number,
                pol.item_code,
                i.description AS item_description,
                i.uom,
                s.id AS supplier_id,
                s.name AS supplier_name,
                COALESCE(dispatched.total_dispatched, 0)::float AS total_dispatched_mt,
                (sca.available_qty_mt - COALESCE(dispatched.total_dispatched, 0))::float AS remaining_qty_mt
            FROM supplier_collection_advices sca
            JOIN purchase_order_lines pol ON sca.po_line_id = pol.id
            JOIN purchase_orders po ON pol.po_number = po.po_number
            JOIN suppliers s ON po.supplier_id = s.id
            JOIN items i ON pol.item_code = i.item_code
            LEFT JOIN (
                SELECT 
                    hcal.supplier_ca_id, 
                    SUM(hcal.quantity_mt) AS total_dispatched
                FROM huachang_collection_advice_lines hcal
                JOIN huachang_collection_advices hca ON hcal.hg_ca_number = hca.hg_ca_number
                WHERE hca.status != 'Cancelled'
                GROUP BY hcal.supplier_ca_id
            ) dispatched ON dispatched.supplier_ca_id = sca.id
            WHERE (sca.available_qty_mt - COALESCE(dispatched.total_dispatched, 0)) > 0
            ${whereItemCondition}
            ORDER BY sca.ca_date DESC, sca.id DESC;
        `;

        const result = await pool.query(query, queryParams);
        const rows = result.rows;

        return res.status(200).json({
            success: true,
            count: rows.length,
            supplier_cas: rows
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch active supplier collection advices'
        });
    }
});

module.exports = router;