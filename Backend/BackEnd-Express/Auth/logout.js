const express = require('express');
const router = express.Router();

router.post('/logout', (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.DEPLOYMENT_STATUS === 'production',
            sameSite: 'Strict',
            path: '/'
        });

        console.log('User logged out successfully, cookie cleared.');

        return res.status(200).json({ 
            success: true, 
            message: 'Logged out successfully' 
        });
    } catch (error) {
        console.error('Logout error on backend:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error during logout closure' 
        });
    }
});

module.exports = router;
