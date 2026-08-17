const express = require('express');
const pool = require('../Static/db_main');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const router = express.Router();

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    try {
        const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        
        if (result.rowCount > 0) {
            const user = result.rows[0];
            const resetToken = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); 
            
            // Upsert: If the user already requested a reset, overwrite their old token
            await pool.query(
                `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (user_id) 
                 DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at`,
                [user.id, hashedToken, expiresAt]
            );

            const resetUrl = `http://103.209.158.213/auth/reset-password?token=${resetToken}`;
            
            // Log for development until email service is integrated
            console.log(`[DEV] Password Reset URL: \n${resetUrl}`);
        }

        return res.json({ 
            success: true, 
            message: 'If an account matches that email, a password reset link has been sent.' 
        });
    } catch (err) {
        console.error('Error in /forgot-password:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

router.get('/verify-reset-token/:token', async (req, res) => {
    const { token } = req.params;

    if (!token) {
        return res.status(400).json({ success: false, message: 'Token is required.' });
    }

    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const result = await pool.query(
            'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
            [hashedToken]
        );

        if (result.rowCount === 0) {
            return res.status(400).json({ success: false, message: 'Token is invalid or has expired.' });
        }

        return res.json({ success: true, message: 'Token is valid.' });
    } catch (err) {
        console.error('Error in /verify-reset-token:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    
    if (!token || !password) {
        return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }

    // Server-side password complexity validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ success: false, message: 'Password does not meet complexity requirements.' });
    }

    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        const tokenResult = await pool.query(
            'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
            [hashedToken]
        );

        if (tokenResult.rowCount === 0) {
            return res.status(400).json({ success: false, message: 'Token is invalid or has expired.' });
        }

        const userId = tokenResult.rows[0].user_id;
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const db_conn = await pool.connect();
        try {
            await db_conn.query('BEGIN');
            
            await db_conn.query(
                'UPDATE users SET password_hash = $1 WHERE id = $2', 
                [hashedPassword, userId]
            );

            await db_conn.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

            await db_conn.query('COMMIT');
        } catch (txnErr) {
            await db_conn.query('ROLLBACK');
            throw txnErr;
        } finally {
            db_conn.release();
        }

        return res.json({ success: true, message: 'Password reset successful.' });
    } catch (err) {
        console.error('Error in /reset-password:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

module.exports = router;