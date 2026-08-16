const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

const SEVERITY_RANK = { Critical: 1, High: 2, Medium: 3 };

async function getAllAlerts() {
    const queries = [
        // 1. Out of Stock
        pool.query(`
            SELECT 'OUT_OF_STOCK' AS type, 'Critical' AS severity, i.item_code, i.description, 0::float AS current_qty
            FROM items i
            LEFT JOIN (SELECT item_code, SUM(current_qty) AS qty FROM inventory_batches WHERE status_confidence = 'Live' GROUP BY item_code) b ON b.item_code = i.item_code
            WHERE COALESCE(b.qty, 0) = 0
              AND EXISTS (SELECT 1 FROM sales_orders so WHERE so.item_code = i.item_code AND so.status NOT IN ('Cancelled', 'Fulfilled'))
        `),

        // 2. Low Stock (below threshold)
        pool.query(`
            SELECT 'LOW_STOCK' AS type, 'High' AS severity, i.item_code, i.description,
                   COALESCE(b.qty, 0)::float AS atp_qty, i.threshold_level::float AS threshold_level
            FROM items i
            LEFT JOIN (SELECT item_code, SUM(current_qty) AS qty FROM inventory_batches WHERE status_confidence = 'Live' GROUP BY item_code) b ON b.item_code = i.item_code
            WHERE i.threshold_level > 0 AND COALESCE(b.qty, 0) < i.threshold_level
        `),

        // 3. Expired Batches
        pool.query(`
            SELECT 'EXPIRED' AS type, 'Critical' AS severity, b.item_code, b.batch_code, l.name AS location,
                   b.expiry_date, b.current_qty::float AS current_qty
            FROM inventory_batches b
            JOIN locations l ON l.id = b.location_id
            WHERE b.expiry_date < CURRENT_DATE AND b.current_qty > 0
        `),

        // 4. Expiring Soon (< 30 days)
        pool.query(`
            SELECT 'EXPIRING' AS type, 'High' AS severity, b.item_code, b.batch_code, l.name AS location,
                   b.expiry_date, b.current_qty::float AS current_qty, (b.expiry_date - CURRENT_DATE) AS days_left
            FROM inventory_batches b
            JOIN locations l ON l.id = b.location_id
            WHERE b.expiry_date >= CURRENT_DATE AND b.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND b.current_qty > 0
        `),

        // 5. Batches Pending Verification (> 24h)
        pool.query(`
            SELECT 'PENDING_VERIFICATION' AS type, 'Medium' AS severity, b.item_code, b.batch_code, l.name AS location,
                   b.created_at, b.current_qty::float AS current_qty
            FROM inventory_batches b
            JOIN locations l ON l.id = b.location_id
            WHERE b.status_confidence = 'Pending' AND b.created_at < NOW() - INTERVAL '24 hours'
        `),

        // 6. CA Inbound Delivery Overdue (> 7 days)
        pool.query(`
            SELECT 'CA_NOT_RECEIVED' AS type, 'Medium' AS severity, hca.item_code, hca.hg_ca_number, l.name AS location,
                   hca.ca_date, hca.quantity_mt::float AS quantity_mt
            FROM huachang_collection_advices hca
            JOIN locations l ON l.id = hca.pickup_location_id
            WHERE hca.status NOT IN ('Completed', 'Cancelled') AND hca.ca_date < CURRENT_DATE - INTERVAL '7 days'
        `),

        // 7. PO Overdue (> 30 days)
        pool.query(`
            SELECT 'PO_OVERDUE' AS type, 'Medium' AS severity, po.item_code, po.po_number, po.po_date,
                   (po.ordered_qty_mt - COALESCE(SUM(sca.available_qty_mt), 0))::float AS uncollected_qty
            FROM purchase_orders po
            LEFT JOIN supplier_collection_advices sca ON sca.po_number = po.po_number
            WHERE po.po_date < CURRENT_DATE - INTERVAL '30 days'
            GROUP BY po.po_number, po.item_code, po.po_date, po.ordered_qty_mt
            HAVING (po.ordered_qty_mt - COALESCE(SUM(sca.available_qty_mt), 0)) > 0
        `)
    ];

    const results = await Promise.all(queries);
    const alerts = results.flatMap(res => res.rows);
    alerts.sort((a, b) => (SEVERITY_RANK[a.severity] || 99) - (SEVERITY_RANK[b.severity] || 99));
    return alerts;
}

router.get('/alerts', async (req, res) => {
    try {
        const alerts = await getAllAlerts();
        res.json({ success: true, alerts });
    } catch (err) {
        console.error('Alerts error:', err);
        res.status(500).json({ success: false, error: 'Failed to load alerts' });
    }
});

module.exports = router;
module.exports.getAllAlerts = getAllAlerts;
