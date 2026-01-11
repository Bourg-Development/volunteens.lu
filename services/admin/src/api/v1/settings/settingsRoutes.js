const express = require('express');
const router = express.Router();

const settingsController = require('./settingsController');
const { verifySecret } = require('../../../middleware/secretAuth');

// All routes require service secret
router.use(verifySecret);

// Get a specific setting
router.get('/:key', settingsController.getSetting);

// Get all settings
router.get('/', settingsController.getAllSettings);

module.exports = router;
