const express = require('express');
const pool = require('../Static/db_main');
const bcrypt = require('bcrypt');
const router = express.Router();

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }
    try {
        const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        
        return res.json({ 
            success: true, 
            message: 'If an account matches that email, a password reset link has been sent.' 
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/reset-password', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, email]);
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.json({ success: true, message: 'Password reset successful.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
