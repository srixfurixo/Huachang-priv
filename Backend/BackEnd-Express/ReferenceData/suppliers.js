const express = require('express');
const pool = require('../Static/db_main');
const router = express.Router();

router.get('/suppliers', async (req, res) => {
try {
    const {include_inactive} = req.query;
    const conditions = include_inactive === 'true' ? [] : ['is_active = true'];
    let whereClause = '';
    if (conditions.length) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    const query = `
    SELECT id, name, is_active
    FROM suppliers
    ${whereClause}
    ORDER BY name ASC
    `;

    const {rows} = await pool.query(query);
    res.json(rows);
}   catch (err) {
        console.error(err);
        res.status(500).json({error: 'Failed to fetch suppliers'});
    }
});

module.exports = router;