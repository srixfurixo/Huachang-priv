const express = require('express');
const pool = require('../Static/db_main');
const { ITEM_TYPE_SQL } = require('../Helpers/itemType');

const router = express.Router();

function parseDate(value) {
    if (!value) {
        return null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return undefined;
    }
    return value;
}

router.get('/overview', async (req, res) => {
    const { warehouse, search, item_code, location_id, location_type, item_type } = req.query;
    const params = [];
    const filters = [`b.status_confidence IN ('Live', 'Reported')`, 'b.current_qty > 0'];

    if (warehouse) {
        params.push(`%${warehouse}%`);
        filters.push(`l.name ILIKE $${params.length}`);
    }

    if (search) {
        params.push(`%${search}%`);
        filters.push(`(
            b.item_code ILIKE $${params.length}
            OR i.description ILIKE $${params.length}
            OR l.name ILIKE $${params.length}
        )`);
    }

    if (item_code) {
        params.push(item_code);
        filters.push(`b.item_code = $${params.length}`);
    }

    if (location_id) {
        params.push(location_id);
        filters.push(`l.id = $${params.length}`);
    }

    if (location_type) {
        params.push(location_type);
        filters.push(`l.location_type = $${params.length}`);
    }

    if (item_type) {
        params.push(item_type);
        filters.push(`(${ITEM_TYPE_SQL}) = $${params.length}`);
    }

    let whereClause = '';
    if (filters.length) {
        whereClause = `WHERE ${filters.join(' AND ')}`;
    }

    try {
        const result = await pool.query(
            `
            SELECT
                ROW_NUMBER() OVER (ORDER BY l.name, b.item_code) AS id,
                b.item_code,
                i.description AS description,
                SUM(b.current_qty)::float AS quantity_mt,
                l.name AS location,
                l.location_type,
                CASE
                    WHEN l.location_type = 'Internal' THEN 'Live'
                    ELSE 'Reported'
                END AS source,
                SUM(CASE WHEN l.location_type = 'Internal' THEN b.current_qty ELSE 0 END)::float AS live_qty_mt,
                SUM(CASE WHEN l.location_type = 'Internal' THEN 0 ELSE b.current_qty END)::float AS reported_qty_mt,
                TO_CHAR(MAX(b.last_verified_at)::date, 'YYYY-MM-DD') AS last_verified
            FROM inventory_batches b
            JOIN items i ON i.item_code = b.item_code
            JOIN locations l ON l.id = b.location_id
            ${whereClause}
            GROUP BY
                l.name,
                l.location_type,
                b.item_code,
                i.description
            ORDER BY l.name, b.item_code;
            `,
            params,
        );

        res.json({ success: true, items: result.rows });
    } catch (err) {
        console.error('Inventory overview error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load inventory overview' });
    }
});

router.get('/movements', async (req, res) => {
    const startDate = parseDate(req.query.startDate);
    const endDate = parseDate(req.query.endDate);

    if (startDate === undefined || endDate === undefined) {
        return res.status(400).json({
            success: false,
            error: 'startDate and endDate must use YYYY-MM-DD format',
        });
    }

    const { item_code, location_id, batch_code, movement_type } = req.query;
    const params = [];
    const filters = [];

    if (startDate) {
        params.push(startDate);
        filters.push(`im.movement_date >= $${params.length}::date`);
    }

    if (endDate) {
        params.push(endDate);
        filters.push(`im.movement_date < ($${params.length}::date + INTERVAL '1 day')`);
    }

    if (item_code) {
        params.push(item_code);
        filters.push(`b.item_code = $${params.length}`);
    }

    if (location_id) {
        params.push(location_id);
        filters.push(`im.location_id = $${params.length}`);
    }

    if (batch_code) {
        params.push(batch_code);
        filters.push(`im.batch_code = $${params.length}`);
    }

    if (movement_type) {
        params.push(movement_type);
        filters.push(`im.movement_type = $${params.length}`);
    }

    let whereClause = '';
    if (filters.length) {
        whereClause = `WHERE ${filters.join(' AND ')}`;
    }

    try {
        const result = await pool.query(
            `
            SELECT
                im.id,
                TO_CHAR(im.movement_date, 'YYYY-MM-DD HH24:MI') AS timestamp,
                CASE
                    WHEN im.movement_type = 'INTAKE' THEN 'Intake'
                    WHEN im.movement_type = 'DISPATCH' THEN 'Delivery Out'
                    WHEN im.movement_type = 'PRODUCTION_CONSUMED' THEN 'Production Consumed'
                    WHEN im.movement_type = 'PRODUCTION_OUTPUT' THEN 'Production Output'
                    ELSE INITCAP(REPLACE(im.movement_type, '_', ' '))
                END AS movement_type,
                b.item_code,
                ABS(im.quantity_change)::float AS quantity_mt,
                im.reference_doc AS reference,
                l.name AS location,
                COALESCE(u.username, 'Legacy import') AS logged_by
            FROM inventory_movements im
            JOIN inventory_batches b ON b.batch_code = im.batch_code
            JOIN locations l ON l.id = im.location_id
            LEFT JOIN users u ON u.id = im.performed_by
            ${whereClause}
            ORDER BY im.movement_date DESC, im.id DESC;
            `,
            params,
        );

        res.json({ success: true, entries: result.rows });
    } catch (err) {
        console.error('Inventory movements error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load inventory movements' });
    }
});

router.get('/alerts/low-stock', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                ROW_NUMBER() OVER (ORDER BY i.item_code, COALESCE(l.name, 'Unassigned')) AS id,
                i.item_code,
                i.description,
                COALESCE(l.name, 'Unassigned') AS location,
                COALESCE(l.location_type, 'External') AS location_type,
                COALESCE(SUM(b.current_qty), 0)::float AS quantity_mt,
                i.threshold_level::float AS threshold_level,
                CASE
                    WHEN COALESCE(SUM(b.current_qty), 0) <= 0 THEN 'Out of Stock'
                    ELSE 'Low Stock'
                END AS alert_type
            FROM items i
            LEFT JOIN inventory_batches b ON b.item_code = i.item_code
            LEFT JOIN locations l ON l.id = b.location_id
            WHERE i.threshold_level > 0
            GROUP BY i.item_code, i.description, i.threshold_level, l.name, l.location_type
            HAVING COALESCE(SUM(b.current_qty), 0) <= i.threshold_level
            ORDER BY i.item_code, COALESCE(l.name, 'Unassigned');
        `);

        res.json({ success: true, alerts: result.rows });
    } catch (err) {
        console.error('Low stock alerts error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load low-stock alerts' });
    }
});

module.exports = router;
