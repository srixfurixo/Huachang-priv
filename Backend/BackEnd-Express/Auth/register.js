const express = require('express');
const pool = require('../Static/db_main')
const bcrypt = require('bcrypt');
const pass_generator = require('../Helpers/passwordgenerator');
const router = express.Router();

router.post('/', async (req, res) => {
    const { 
        first_name,
        last_name,
        email,
        username,
        role_id,
        staff_id
    } = req.body;

    if (!first_name || !last_name || !email || !username || !role_id) {
        return res.status(400).json({ success: false, message: 'All fields except staff_id are required' });
    }

    const db_conn = await pool.connect(); // check and acquire a client from the pool
    let transactionStarted = false;

    try {
        const existing_check = await db_conn.query('SELECT id FROM users WHERE email = $1 OR username = $2 or staff_id = $3', [email, username, staff_id]);

        if (existing_check.rows.length > 0) {
            let conflict_details = '';
            const existing_user = existing_check.rows[0];
            if (existing_user.email === email) conflict_details += 'Email already exists. ';
            if (existing_user.username === username) conflict_details += 'Username already exists. ';
            if (staff_id && existing_user.staff_id === staff_id) conflict_details += 'Staff ID already exists. ';
            return res.status(409).json({ success: false, message: conflict_details.trim() });
        }

        await db_conn.query('BEGIN'); // start transaction
        transactionStarted = true;

        const password_generated = pass_generator(12);
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password_generated, saltRounds);

        const insert_query = `
            INSERT INTO users (first_name, last_name, username, email, password_hash, staff_id, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, TRUE)
            RETURNING id;
        `;

        const insert_result = await db_conn.query(insert_query, [first_name, last_name, username, email, password_hash, staff_id]);
        const new_user_id = insert_result.rows[0].id;

        const role_insert_query = `
            INSERT INTO user_roles (user_id, role_id)
            VALUES ($1, $2);
        `;

        await db_conn.query(role_insert_query, [new_user_id, role_id]);
        await db_conn.query('COMMIT'); // commit for all operations 

        res.status(201).json({ success: true, 
            message: `User: ${username} registered successfully`, 
            user_id: new_user_id, 
            generated_password: password_generated 
        });
    } catch (err) {
        if (transactionStarted) {
            await db_conn.query('ROLLBACK');
        }
        console.error('Registration error:', err.stack);
        res.status(500).json({ success: false, message: 'An error occurred during registration' });
    } finally {
        db_conn.release(); // release the client back to the pool
    }

});

module.exports = router;
