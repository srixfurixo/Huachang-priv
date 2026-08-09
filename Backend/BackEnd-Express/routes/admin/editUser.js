const express = require('express');
const router = express.Router();
const db = require('../../Static/db_main');

router.put('/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const { first_name, last_name, email, is_active, role_name } = req.body;

    let client;
    try {
        client = await db.connect();
        await client.query('BEGIN');

        await client.query(
            'UPDATE users SET first_name = $1, last_name = $2, email = $3, is_active = $4 WHERE id = $5',
            [first_name, last_name, email, is_active, user_id]
        );

        const roleResult = await client.query(
            'SELECT id FROM roles WHERE role_name = $1',
            [role_name]
        );

        if (roleResult.rows.length === 0) {
            throw new Error('Role not found');
        }

        const roleId = roleResult.rows[0].id;

        await client.query(
            'UPDATE user_roles SET role_id = $1 WHERE user_id = $2',
            [roleId, user_id]
        );

        await client.query('COMMIT');
        res.status(200).json({ success: true, message: 'User profile updated successfully' });
    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (client) {
            client.release();
        }
    }
});

module.exports = router;
