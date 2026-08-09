const express = require('express');
const pool = require('../Static/db_main')
const bcrypt = require('bcrypt');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
    const { passed_in_username, passed_in_password } = req.body;
    console.log('Login attempt for username/email:', passed_in_username);
    const jwt_secret = process.env.JWT_SECRET;

    if (!passed_in_username || !passed_in_password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user_query = `
        SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.password_hash, u.is_active, r.role_name 
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.email = $1 OR u.username = $1
    `;

    try  { 
        const retrieved_data = await pool.query(user_query, [passed_in_username]);

        if (retrieved_data.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        const user = retrieved_data.rows[0];
        console.log('Attempting to compare:', passed_in_password, 'with hash:', user.password_hash);
        const passwordMatch = await bcrypt.compare(passed_in_password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        } else { 
            console.log('Password match successful for user:', user.username);
        }

            if (!user.is_active) {
            return res.status(403).json({ success: false, message: 'Account is inactive. Please contact support.' });
        }

        const user_role = user.role_name || 'Null';

        const payload = {
            id: user.id,
            username: user.username,
            role: user_role
        };

        const token = jwt.sign(payload, jwt_secret, { expiresIn: '24h' });

        res.cookie('token', token, { 
            httpOnly: true, 
            secure: process.env.DEPLOYMENT_STATUS === 'production',
            sameSite: 'Strict', 
            maxAge: 24 * 60 * 60 * 1000 
        });
        

        return res.json({
            success: true,
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                role : user_role
            }
        });
    } catch (err) {
        console.error('Login error:', err.stack);
        return res.status(500).json({ success: false, message: 'An error occurred during login' });
    }
});

module.exports = router;