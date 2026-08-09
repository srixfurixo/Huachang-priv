const express = require('express');
const pool = require('../Static/db_main');
const router = express.Router();

router.get('/locations', async (req, res) => {
try{
    const{location_type} = req.query;

    const conditions = ['is_active = true'];
    const values = []; 

    if(location_type){
        conditions.push(`location_type = $1`);
        values.push(location_type);
    }

    const query = `
    SELECT id, name, location_type, is_active
    FROM locations
    WHERE ${conditions.join(' AND ')}
    ORDER BY name ASC
    `;

    const {rows} = await pool.query(query, values);
    res.json(rows);
}   catch (err) {
        console.error(err);
        res.status(500).json({error: 'Failed to fetch locations'});
    }
});

module.exports = router;