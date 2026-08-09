const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');
const { getAvailability } = require('../../Helpers/availability');
const { getAllAlerts } = require('./alerts');
const { BUCKET_SQL, BUCKET_ORDER } = require('./aging');

function buildFilters(query) {
    const { location_id, location_type, item_code, status, search } = query;
    const params = [];
    const conditions = [];

    if (location_id) {
        params.push(location_id);
        conditions.push(`l.id = $${params.length}`);
    }

    if (location_type) {
        params.push(location_type);
        conditions.push(`l.location_type = $${params.length}`);
    }

    if (item_code) {
        params.push(item_code);
        conditions.push(`b.item_code = $${params.length}`);
    }

    if (search) {
        params.push(`%${search}%`);
        conditions.push(`(b.item_code ILIKE $${params.length} OR b.batch_code ILIKE $${params.length})`);
    }

    if (status) {
        params.push(status);
        conditions.push(`b.status_confidence = $${params.length}`);
    } else {
        conditions.push(`b.status_confidence IN ('Live', 'Reported')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params };
}

router.get('/dashboard/summary', async (req, res) => {
    try {
        const { whereClause, params } = buildFilters(req.query);


        const kpiQuery = `
            SELECT
                COALESCE(SUM(CASE WHEN b.status_confidence = 'Live' THEN b.current_qty ELSE 0 END), 0)::float AS live_mt,
                COALESCE(SUM(CASE WHEN b.status_confidence = 'Reported' THEN b.current_qty ELSE 0 END), 0)::float AS reported_mt,
                COALESCE(SUM(CASE WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN b.current_qty ELSE 0 END), 0)::float AS expiring_60d_mt
            FROM inventory_batches b
            JOIN locations l ON l.id = b.location_id
            ${whereClause}
        `;
        const kpiDb = await pool.query(kpiQuery, params);
        const liveMt = Number(kpiDb.rows[0].live_mt);
        const reportedMt = Number(kpiDb.rows[0].reported_mt);

        const inboundDb = await pool.query(`
            SELECT COALESCE(SUM(quantity_mt), 0)::float AS inbound_mt, COUNT(*) AS active_ca_count
            FROM huachang_collection_advices
            WHERE status NOT IN ('Completed', 'Cancelled')
        `);

        const availability = await getAvailability();
        let totalAtp = 0;
        for (const item of availability) {
            totalAtp += Number(item.available_to_promise || 0);
        }

        const netChangeDb = await pool.query(`
            SELECT COALESCE(SUM(quantity_change), 0)::float AS net_change_7d
            FROM inventory_movements
            WHERE movement_date >= NOW() - INTERVAL '7 days'
        `);

        const allAlerts = await getAllAlerts();
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let oversoldCount = 0;
        let staleReportCount = 0;

        for (const alert of allAlerts) {
            if (alert.type === 'LOW_STOCK') lowStockCount++;
            if (alert.type === 'OUT_OF_STOCK') outOfStockCount++;
            if (alert.type === 'OVERSOLD') oversoldCount++;
            if (alert.type === 'STALE_REPORT') staleReportCount++;
        }

        const kpis = {
            total_on_hand_mt: liveMt + reportedMt,
            live_mt: liveMt,
            reported_mt: reportedMt,
            available_to_promise_mt: totalAtp,
            inbound_mt: Number(inboundDb.rows[0].inbound_mt),
            active_ca_count: Number(inboundDb.rows[0].active_ca_count),
            expiring_60d_mt: Number(kpiDb.rows[0].expiring_60d_mt),
            net_change_7d_mt: Number(netChangeDb.rows[0].net_change_7d),
            low_stock_count: lowStockCount,
            out_of_stock_count: outOfStockCount,
            oversold_count: oversoldCount,
            stale_report_count: staleReportCount
        };


        const compositionQuery = `
            SELECT
                CASE
                    WHEN i.can_be_produced THEN 'Finished Good'
                    WHEN i.can_be_consumed AND NOT i.can_be_sold THEN 'Raw Material'
                    ELSE 'Trading Item'
                END AS item_type,
                SUM(b.current_qty)::float AS qty_mt
            FROM inventory_batches b
            JOIN locations l ON l.id = b.location_id
            JOIN items i ON i.item_code = b.item_code
            ${whereClause}
            GROUP BY item_type
        `;
        const compositionDb = await pool.query(compositionQuery, params);


        const agingQuery = `
            SELECT ${BUCKET_SQL} AS bucket, SUM(b.current_qty)::float AS qty_mt, COUNT(*) AS batch_count
            FROM inventory_batches b
            JOIN locations l ON l.id = b.location_id
            ${whereClause} ${whereClause ? 'AND' : 'WHERE'} b.current_qty > 0
            GROUP BY bucket
        `;
        const agingDb = await pool.query(agingQuery, params);

        const aging = BUCKET_ORDER.map(bucketName => {
            const found = agingDb.rows.find(row => row.bucket === bucketName);
            return {
                bucket: bucketName,
                qty_mt: found ? Number(found.qty_mt) : 0,
                batch_count: found ? Number(found.batch_count) : 0
            };
        });


        const poQuery = `
            SELECT 
                po.po_number, 
                s.name AS supplier, 
                po.ordered_qty_mt::float AS ordered_mt,
                COALESCE(SUM(sca.available_qty_mt), 0)::float AS collected_mt, 
                po.status
            FROM purchase_orders po
            JOIN suppliers s ON s.id = po.supplier_id
            LEFT JOIN supplier_collection_advices sca ON sca.po_number = po.po_number
            WHERE po.status != 'Fully Collected'
            GROUP BY po.po_number, s.name, po.ordered_qty_mt, po.status
            ORDER BY po.po_date DESC 
            LIMIT 20
        `;
        const poDb = await pool.query(poQuery);


        const movementsQuery = `
            SELECT 
                im.id, 
                b.item_code, 
                l.name AS location, 
                im.movement_type,
                ABS(im.quantity_change)::float AS quantity_mt, 
                im.movement_date,
                COALESCE(u.username, 'System') AS performed_by
            FROM inventory_movements im
            JOIN inventory_batches b ON b.batch_code = im.batch_code
            JOIN locations l ON l.id = im.location_id
            LEFT JOIN users u ON u.id = im.performed_by
            ORDER BY im.movement_date DESC 
            LIMIT 10
        `;
        const movementsDb = await pool.query(movementsQuery);


        res.json({
            success: true,
            kpis,
            demand_vs_supply: availability,
            composition: compositionDb.rows,
            aging,
            po_pipeline: poDb.rows,
            alerts: allAlerts.slice(0, 20),
            recent_movements: movementsDb.rows
        });

    } catch (err) {
        console.error('Dashboard summary API error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load dashboard summary' });
    }
});

module.exports = router;