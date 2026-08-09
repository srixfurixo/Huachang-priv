const express = require('express');
const pool = require('../Static/db_main');
const router = express.Router();

router.patch('/items/:item_code/settings', async (req, res) => {
    const { item_code } = req.params;
    const { threshold_level, bag_weight_kg } = req.body;

    if (threshold_level === undefined && bag_weight_kg === undefined) {
        return res.status(400).json({
            success: false,
            error: 'Provide at least one of threshold_level or bag_weight_kg to update.'
        });
    }

    if (threshold_level !== undefined && threshold_level !== null && Number(threshold_level) < 0) {
        return res.status(400).json({ success: false, error: 'threshold_level must be zero or greater.' });
    }

    if (bag_weight_kg !== undefined && bag_weight_kg !== null && Number(bag_weight_kg) <= 0) {
        return res.status(400).json({ success: false, error: 'bag_weight_kg must be greater than 0, or null to clear it.' });
    }

    const setClauses = [];
    const values = [];
    let idx = 1;

    if (threshold_level !== undefined) {
        setClauses.push(`threshold_level = $${idx++}`);
        values.push(threshold_level);
    }

    if (bag_weight_kg !== undefined) {
        setClauses.push(`bag_weight_kg = $${idx++}`);
        values.push(bag_weight_kg);
    }

    values.push(item_code);

    try {
        const result = await pool.query(
            `UPDATE items SET ${setClauses.join(', ')} WHERE item_code = $${idx} RETURNING item_code, threshold_level, bag_weight_kg`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Item '${item_code}' not found.` });
        }

        res.json({ success: true, message: 'Item settings updated.', item: result.rows[0] });
    } catch (err) {
        console.error('Item settings update error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to update item settings' });
    }
});

module.exports = router;
