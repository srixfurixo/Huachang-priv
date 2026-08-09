const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');
const { ITEM_TYPE_SQL } = require('../../Helpers/itemType');
const { getAvailability } = require('../../Helpers/availability');

router.get('/items/:item_code', async (req, res) => {
    const { item_code } = req.params;

    try {
        const itemResult = await pool.query(
            `SELECT item_code, description, uom, threshold_level, bag_weight_kg, (${ITEM_TYPE_SQL}) AS item_type
             FROM items i WHERE item_code = $1`,
            [item_code]
        );

        if (itemResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Item '${item_code}' not found.` });
        }

        const item = itemResult.rows[0];

        const [availabilityRow] = await getAvailability([item_code]);
        // no allocations/batches yet for this item means getAvailability won't return a row at all
        const availability = availabilityRow || {
            on_hand_mt: 0, reported_mt: 0, committed_mt: 0, soft_committed_mt: 0, inbound_mt: 0, available_to_promise: 0
        };

        const liveMt = Number(availability.on_hand_mt);
        const reportedMt = Number(availability.reported_mt);
        const totals = {
            on_hand_mt: liveMt + reportedMt,
            live_mt: liveMt,
            reported_mt: reportedMt,
            committed_mt: Number(availability.committed_mt),
            soft_committed_mt: Number(availability.soft_committed_mt),
            inbound_mt: Number(availability.inbound_mt),
            available_to_promise: Number(availability.available_to_promise)
        };

        const bag_equivalent = item.bag_weight_kg
            ? (totals.on_hand_mt * 1000) / Number(item.bag_weight_kg)
            : null;

        const byLocationResult = await pool.query(
            `
            SELECT
                l.name AS location,
                l.location_type,
                SUM(b.current_qty)::float AS quantity_mt,
                COUNT(b.batch_code) AS batch_count,
                MAX(b.last_verified_at) AS last_verified_at
            FROM inventory_batches b
            JOIN locations l ON l.id = b.location_id
            WHERE b.item_code = $1
            GROUP BY l.name, l.location_type
            ORDER BY l.name
            `,
            [item_code]
        );

        const batchesResult = await pool.query(
            `
            SELECT
                b.batch_code, b.location_id, l.name AS location, l.location_type,
                b.current_qty::float AS current_qty, b.manufacture_date, b.expiry_date,
                b.status_confidence, b.hg_ca_number
            FROM inventory_batches b
            JOIN locations l ON l.id = b.location_id
            WHERE b.item_code = $1
            ORDER BY b.manufacture_date ASC NULLS LAST, b.created_at ASC
            `,
            [item_code]
        );

        const openPurchaseOrdersResult = await pool.query(
            `
            SELECT
                po.po_number, po.supplier_id, s.name AS supplier_name, po.po_date,
                po.ordered_qty_mt::float AS ordered_qty_mt,
                COALESCE(SUM(sca.available_qty_mt), 0)::float AS collected_qty_mt,
                (po.ordered_qty_mt - COALESCE(SUM(sca.available_qty_mt), 0))::float AS remaining_qty_mt
            FROM purchase_orders po
            JOIN suppliers s ON s.id = po.supplier_id
            LEFT JOIN supplier_collection_advices sca ON sca.po_number = po.po_number
            WHERE po.item_code = $1
            GROUP BY po.po_number, po.supplier_id, s.name, po.po_date, po.ordered_qty_mt
            HAVING (po.ordered_qty_mt - COALESCE(SUM(sca.available_qty_mt), 0)) > 0
            ORDER BY po.po_date ASC
            `,
            [item_code]
        );

        const openSalesOrdersResult = await pool.query(
            `
            SELECT so.so_number, so.customer_id, c.name AS customer_name, so.so_date,
                   so.ordered_qty_mt::float AS ordered_qty_mt, so.status
            FROM sales_orders so
            JOIN customers c ON c.id = so.customer_id
            WHERE so.item_code = $1 AND so.status NOT IN ('Cancelled', 'Fulfilled')
            ORDER BY so.so_date ASC
            `,
            [item_code]
        );

        res.json({
            success: true,
            item,
            totals,
            bag_equivalent,
            by_location: byLocationResult.rows,
            batches: batchesResult.rows,
            open_purchase_orders: openPurchaseOrdersResult.rows,
            open_sales_orders: openSalesOrdersResult.rows
        });
    } catch (err) {
        console.error('Item detail error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load item detail' });
    }
});

module.exports = router;
