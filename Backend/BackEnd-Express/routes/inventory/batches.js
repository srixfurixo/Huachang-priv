const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');
const { ITEM_TYPE_SQL } = require('../../Helpers/itemType');

router.get('/batches', async (req, res) => {
    const {
        item_code, location_id, location_type, status_confidence,
        expiring_before, min_qty, batch_code, hg_ca_number,
        page, limit
    } = req.query;

    const params = [];
    const filters = [];

    if (item_code) {
        params.push(item_code);
        filters.push(`b.item_code = $${params.length}`);
    }

    if (location_id) {
        params.push(location_id);
        filters.push(`b.location_id = $${params.length}`);
    }

    if (location_type) {
        params.push(location_type);
        filters.push(`l.location_type = $${params.length}`);
    }

    if (status_confidence) {
        params.push(status_confidence);
        filters.push(`b.status_confidence = $${params.length}`);
    }

    if (expiring_before) {
        params.push(expiring_before);
        filters.push(`b.expiry_date <= $${params.length}::date`);
    }

    if (min_qty) {
        params.push(min_qty);
        filters.push(`b.current_qty >= $${params.length}`);
    }

    if (batch_code) {
        params.push(`%${batch_code}%`);
        filters.push(`b.batch_code ILIKE $${params.length}`);
    }

    if (hg_ca_number) {
        params.push(hg_ca_number);
        filters.push(`b.hg_ca_number = $${params.length}`);
    }

    let whereClause = '';
    if (filters.length) {
        whereClause = `WHERE ${filters.join(' AND ')}`;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 50);
    const offset = (pageNum - 1) * pageSize;

    try {
        const countResult = await pool.query(
            `SELECT COUNT(*) AS total
             FROM inventory_batches b
             JOIN locations l ON l.id = b.location_id
             ${whereClause}`,
            params
        );
        const total = Number(countResult.rows[0].total);

        const dataParams = [...params, pageSize, offset];
        const result = await pool.query(
            `
            SELECT
                b.batch_code,
                b.item_code,
                i.description,
                i.uom,
                l.name AS location,
                l.location_type,
                b.current_qty::float AS current_qty,
                b.manufacture_date,
                b.expiry_date,
                CASE WHEN b.expiry_date IS NOT NULL THEN (b.expiry_date - CURRENT_DATE) ELSE NULL END AS days_to_expiry,
                b.status_confidence,
                b.last_verified_at,
                CASE WHEN b.last_verified_at IS NOT NULL THEN EXTRACT(DAY FROM (NOW() - b.last_verified_at)) ELSE NULL END AS days_since_verified,
                b.hg_ca_number,
                (${ITEM_TYPE_SQL}) AS item_type
            FROM inventory_batches b
            JOIN items i ON i.item_code = b.item_code
            JOIN locations l ON l.id = b.location_id
            ${whereClause}
            ORDER BY b.manufacture_date ASC NULLS LAST, b.created_at ASC
            LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
            `,
            dataParams
        );

        res.json({ success: true, total, page: pageNum, limit: pageSize, batches: result.rows });
    } catch (err) {
        console.error('Batches list error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load batches' });
    }
});

router.get('/batches/:batch_code', async (req, res) => {
    const { batch_code } = req.params;

    try {
        const batchResult = await pool.query(
            `
            SELECT
                b.*,
                i.description,
                i.uom,
                l.name AS location,
                l.location_type,
                (${ITEM_TYPE_SQL}) AS item_type
            FROM inventory_batches b
            JOIN items i ON i.item_code = b.item_code
            JOIN locations l ON l.id = b.location_id
            WHERE b.batch_code = $1
            `,
            [batch_code]
        );

        if (batchResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Batch '${batch_code}' not found.` });
        }

        const movementsResult = await pool.query(
            `
            SELECT
                im.id,
                im.movement_type,
                im.quantity_change::float AS quantity_change,
                im.reference_doc,
                im.remarks,
                im.movement_date,
                COALESCE(u.username, 'Legacy import') AS performed_by
            FROM inventory_movements im
            LEFT JOIN users u ON u.id = im.performed_by
            WHERE im.batch_code = $1
            ORDER BY im.movement_date DESC
            `,
            [batch_code]
        );

        res.json({ success: true, batch: batchResult.rows[0], movements: movementsResult.rows });
    } catch (err) {
        console.error('Batch detail error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load batch detail' });
    }
});

module.exports = router;
