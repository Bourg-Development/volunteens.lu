const express = require('express');
const router = express.Router();
const internalController = require('./internalController');

router.post('/verify', internalController.verify);
router.get('/users/:userId/profile', internalController.getUserProfile);

module.exports = router;
