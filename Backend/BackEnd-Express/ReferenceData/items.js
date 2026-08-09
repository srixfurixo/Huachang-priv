const express = require('express');
const pool = require('../Static/db_main');
const router = express.Router();

router.get('/items', async(req, res)=>{
    try {
        const{can_be_sold, can_be_consumed, can_be_produced, include_inactive} = req.query;

        const conditions =  [];
        const values = [];
        let idx = 1;

        if (can_be_sold !== undefined){
            conditions.push(`can_be_sold = $${idx++}`);
            values.push(can_be_sold ==='true');
        }

        if (can_be_consumed !== undefined){
            conditions.push(`can_be_consumed = $${idx++}`);
            values.push(can_be_consumed === 'true');
        }

        if (can_be_produced !== undefined){
            conditions.push(`can_be_produced = $${idx++}`);
            values.push(can_be_produced ==='true');
        }

        if (include_inactive !== 'true'){
            conditions.push(`is_active = true`);
        }

        let whereClause = '';
        if (conditions.length) {
            whereClause = `WHERE ${conditions.join(' AND ')}`;
        }

        const query = `
        SELECT item_code, description, uom, threshold_level, can_be_sold, can_be_consumed, can_be_produced, is_active
        FROM items
        ${whereClause}
        ORDER BY description ASC
        `;

        const {rows} = await pool.query(query, values);
        res.json(rows);
}       catch (err) {
            console.error(err);
            res.status(500).json({error: 'Failed to fetch items'});
        }

});

module.exports = router;