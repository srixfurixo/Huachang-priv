const express = require('express');
const pool = require('../Static/db_main');
const router = express.Router();

router.get('/customers', async (req, res) =>{
try{
    const {include_inactive} = req.query;
    const conditions = include_inactive === 'true' ? [] : ['is_active = true'];
    let whereClause = '';
    if (conditions.length) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    const query = `
    SELECT id, debtor_code, name, is_active
    FROM customers
    ${whereClause}
    ORDER BY name ASC
    `;

    const {rows} = await pool.query(query);
    res.json(rows);
} catch (err) {
        console.error(err);
        res.status(500).json({error: 'Failed to fetch customers'});
    }

});

module.exports = router;