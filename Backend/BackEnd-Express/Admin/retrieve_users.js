const express = require('express');
const pool = require('../Static/db_main');
const router = express.Router();


router.get('/retrieve_users', async (req, res) => {
    const query = `
        SELECT 
        u.id,
        u.first_name, 
        u.last_name, 
        u.username, 
        u.email, 
        u.staff_id,
        r.role_name AS role, 
        u.is_active
    FROM users u
    INNER JOIN user_roles ur ON u.id = ur.user_id
    INNER JOIN roles r ON ur.role_id = r.id;
    `;

    try {
        const { rows } = await pool.query(query);
        return res.status(200).json({ 
            success: true,
            count: rows.length,
            users: rows
        });
    } catch (error) {
        console.error('Database error: Cannot Reach', error);
        return res.status(500).json({ success: false, message: 'An error occurred while retrieving users' });
    }
});

module.exports = router;