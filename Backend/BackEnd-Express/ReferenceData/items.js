const express = require('express');
const pool = require('../Static/db_main');
const authorize = require('../middleware/authorize');
const router = express.Router();

const ITEM_FIELDS = `item_code, description, uom, bag_weight_kg, threshold_level,
    can_be_sold, can_be_consumed, can_be_produced, is_active`;

function parseBoolean(value, fieldName) {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new Error(`${fieldName} must be true or false.`);
}

function validateItemDetails(body, { isCreate = false } = {}) {
    const item = {};

    if (isCreate) {
        const itemCode = String(body.item_code || '').trim().toUpperCase();
        if (!itemCode) throw new Error('item_code is required.');
        if (itemCode.length > 80) throw new Error('item_code must be 80 characters or fewer.');
        item.item_code = itemCode;
    }

    if (isCreate || body.description !== undefined) {
        const description = String(body.description || '').trim();
        if (!description) throw new Error('description is required.');
        if (description.length > 255) throw new Error('description must be 255 characters or fewer.');
        item.description = description;
    }

    if (isCreate || body.uom !== undefined) {
        const uom = String(body.uom || '').trim().toUpperCase();
        if (!uom) throw new Error('uom is required.');
        if (uom.length > 20) throw new Error('uom must be 20 characters or fewer.');
        item.uom = uom;
    }

    if (body.threshold_level !== undefined) {
        const thresholdLevel = Number(body.threshold_level);
        if (!Number.isFinite(thresholdLevel) || thresholdLevel < 0) {
            throw new Error('threshold_level must be a number that is zero or greater.');
        }
        item.threshold_level = thresholdLevel;
    } else if (isCreate) {
        item.threshold_level = 0;
    }

    if (body.bag_weight_kg !== undefined) {
        if (body.bag_weight_kg === null || body.bag_weight_kg === '') {
            item.bag_weight_kg = null;
        } else {
            const bagWeight = Number(body.bag_weight_kg);
            if (!Number.isFinite(bagWeight) || bagWeight <= 0) {
                throw new Error('bag_weight_kg must be greater than zero, or null to clear it.');
            }
            item.bag_weight_kg = bagWeight;
        }
    } else if (isCreate) {
        item.bag_weight_kg = null;
    }

    for (const field of ['can_be_sold', 'can_be_consumed', 'can_be_produced']) {
        if (body[field] !== undefined) item[field] = parseBoolean(body[field], field);
        else if (isCreate) item[field] = false;
    }

    return item;
}

router.get('/items', async (req, res) => {
    try {
        const { include_inactive, search } = req.query;
        const conditions = [];
        const values = [];
        let idx = 1;

        for (const field of ['can_be_sold', 'can_be_consumed', 'can_be_produced']) {
            if (req.query[field] !== undefined) {
                conditions.push(`${field} = $${idx++}`);
                values.push(parseBoolean(req.query[field], field));
            }
        }

        if (include_inactive !== 'true') conditions.push('is_active = true');

        if (search && String(search).trim()) {
            conditions.push(`(item_code ILIKE $${idx} OR description ILIKE $${idx})`);
            values.push(`%${String(search).trim()}%`);
            idx += 1;
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const { rows } = await pool.query(
            `SELECT ${ITEM_FIELDS} FROM items ${whereClause} ORDER BY is_active DESC, description ASC`,
            values,
        );
        res.json(rows);
    } catch (err) {
        if (err.message?.includes('must be true or false')) {
            return res.status(400).json({ error: err.message });
        }
        console.error('Item fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

router.post('/items', authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const item = validateItemDetails(req.body, { isCreate: true });
        const { rows } = await pool.query(
            `INSERT INTO items (item_code, description, uom, bag_weight_kg, threshold_level,
                can_be_sold, can_be_consumed, can_be_produced, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
             RETURNING ${ITEM_FIELDS}`,
            [item.item_code, item.description, item.uom, item.bag_weight_kg, item.threshold_level,
                item.can_be_sold, item.can_be_consumed, item.can_be_produced],
        );
        res.status(201).json({ success: true, item: rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'An item with this item code already exists. Restore it if it is inactive.' });
        }
        if (err.message) return res.status(400).json({ error: err.message });
        console.error('Item creation error:', err);
        res.status(500).json({ error: 'Failed to create item' });
    }
});

router.patch('/items/:item_code', authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const item = validateItemDetails(req.body);
        const fields = Object.keys(item);
        if (!fields.length) return res.status(400).json({ error: 'Provide at least one item field to update.' });

        const values = fields.map((field) => item[field]);
        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        values.push(req.params.item_code);
        const { rows } = await pool.query(
            `UPDATE items SET ${setClause} WHERE item_code = $${values.length} RETURNING ${ITEM_FIELDS}`,
            values,
        );
        if (!rows.length) return res.status(404).json({ error: 'Item not found.' });
        res.json({ success: true, item: rows[0] });
    } catch (err) {
        if (err.message) return res.status(400).json({ error: err.message });
        console.error('Item update error:', err);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

router.delete('/items/:item_code', authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const { rows } = await pool.query(
            `UPDATE items SET is_active = false
             WHERE item_code = $1 AND is_active = true
             RETURNING ${ITEM_FIELDS}`,
            [req.params.item_code],
        );
        if (!rows.length) return res.status(404).json({ error: 'Active item not found.' });
        res.json({ success: true, message: 'Item marked as inactive.', item: rows[0] });
    } catch (err) {
        console.error('Item deactivation error:', err);
        res.status(500).json({ error: 'Failed to deactivate item' });
    }
});

router.patch('/items/:item_code/restore', authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const { rows } = await pool.query(
            `UPDATE items SET is_active = true
             WHERE item_code = $1 AND is_active = false
             RETURNING ${ITEM_FIELDS}`,
            [req.params.item_code],
        );
        if (!rows.length) return res.status(404).json({ error: 'Inactive item not found.' });
        res.json({ success: true, message: 'Item reactivated.', item: rows[0] });
    } catch (err) {
        console.error('Item restore error:', err);
        res.status(500).json({ error: 'Failed to restore item' });
    }
});

module.exports = router;
