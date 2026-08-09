const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');
const { ITEM_TYPE_SQL } = require('../../Helpers/itemType');
const { getAvailability } = require('../../Helpers/availability');

router.get('/availability', async (req, res) => {
    const { item_code, item_type, only_oversold, only_below_threshold } = req.query;
    const params = [];
    const filters = ['i.is_active = true'];

    if (item_code) {
        params.push(item_code);
        filters.push(`i.item_code = $${params.length}`);
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
        const metaResult = await pool.query(
            `SELECT i.item_code, i.description, i.threshold_level::float AS threshold_level, (${ITEM_TYPE_SQL}) AS item_type
             FROM items i ${whereClause}`,
            params
        );

        const availability = await getAvailability(item_code ? [item_code] : null);
        const availabilityMap = new Map(availability.map((row) => [row.item_code, row]));

        let rows = [];
        for (const meta of metaResult.rows) {
            const a = availabilityMap.get(meta.item_code) || {
                on_hand_mt: 0, reported_mt: 0, inbound_mt: 0, committed_mt: 0, soft_committed_mt: 0, available_to_promise: 0
            };
            const onHand = Number(a.on_hand_mt);
            const inbound = Number(a.inbound_mt);
            const committed = Number(a.committed_mt);

            rows.push({
                item_code: meta.item_code,
                description: meta.description,
                item_type: meta.item_type,
                on_hand_mt: onHand,
                reported_mt: Number(a.reported_mt),
                inbound_mt: inbound,
                committed_mt: committed,
                soft_committed_mt: Number(a.soft_committed_mt),
                available_to_promise: Number(a.available_to_promise),
                threshold_level: meta.threshold_level,
                is_oversold: committed > onHand + inbound
            });
        }

        if (only_oversold === 'true') {
            const filtered = [];
            for (const row of rows) {
                if (row.is_oversold) {
                    filtered.push(row);
                }
            }
            rows = filtered;
        }

        if (only_below_threshold === 'true') {
            const filtered = [];
            for (const row of rows) {
                if (row.threshold_level !== null && row.available_to_promise < row.threshold_level) {
                    filtered.push(row);
                }
            }
            rows = filtered;
        }

        res.json({ success: true, availability: rows });
    } catch (err) {
        console.error('Availability report error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load availability report' });
    }
});

module.exports = router;
