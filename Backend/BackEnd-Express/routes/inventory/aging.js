const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

const BUCKET_SQL = `
    CASE
        WHEN b.expiry_date IS NULL THEN 'No expiry date set'
        WHEN b.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN b.expiry_date - CURRENT_DATE < 30 THEN 'Under 30 days'
        WHEN b.expiry_date - CURRENT_DATE < 60 THEN '30 to 60 days'
        WHEN b.expiry_date - CURRENT_DATE < 90 THEN '60 to 90 days'
        WHEN b.expiry_date - CURRENT_DATE < 180 THEN '90 to 180 days'
        ELSE 'Over 180 days'
    END
`;

const BUCKET_ORDER = [
    'Expired', 'Under 30 days', '30 to 60 days', '60 to 90 days',
    '90 to 180 days', 'Over 180 days', 'No expiry date set'
];

router.get('/aging', async (req, res) => {
    const { location_id, item_code } = req.query;
    const params = [];
    const filters = ['b.current_qty > 0'];

    if (location_id) {
        params.push(location_id);
        filters.push(`b.location_id = $${params.length}`);
    }

    if (item_code) {
        params.push(item_code);
        filters.push(`b.item_code = $${params.length}`);
    }

    let whereClause = '';
    if (filters.length) {
        whereClause = `WHERE ${filters.join(' AND ')}`;
    }

    try {
        const bucketsResult = await pool.query(
            `
            SELECT
                ${BUCKET_SQL} AS bucket,
                SUM(b.current_qty)::float AS qty_mt,
                COUNT(*) AS batch_count
            FROM inventory_batches b
            ${whereClause}
            GROUP BY bucket
            `,
            params
        );

        const buckets = [];
        for (const name of BUCKET_ORDER) {
            const match = bucketsResult.rows.find((row) => row.bucket === name);
            if (match) {
                buckets.push({
                    bucket: name,
                    qty_mt: Number(match.qty_mt),
                    batch_count: Number(match.batch_count)
                });
            } else {
                buckets.push({
                    bucket: name,
                    qty_mt: 0,
                    batch_count: 0
                });
            }
        }

        const oldestResult = await pool.query(
            `
            SELECT
                b.batch_code, b.item_code, i.description, l.name AS location,
                b.current_qty::float AS current_qty, b.manufacture_date, b.expiry_date, b.status_confidence
            FROM inventory_batches b
            JOIN items i ON i.item_code = b.item_code
            JOIN locations l ON l.id = b.location_id
            ${whereClause}
            ORDER BY b.manufacture_date ASC NULLS LAST, b.created_at ASC
            LIMIT 20
            `,
            params
        );

        res.json({ success: true, buckets, oldest_batches: oldestResult.rows });
    } catch (err) {
        console.error('Aging report error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load aging report' });
    }
});

module.exports = router;
module.exports.BUCKET_SQL = BUCKET_SQL;
module.exports.BUCKET_ORDER = BUCKET_ORDER;
