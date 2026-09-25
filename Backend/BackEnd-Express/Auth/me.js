const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');

router.get('/me', authenticate, (req, res) => {
    return res.status(200).json({
        success: true,
        user: req.user
    });
});

module.exports = router;
