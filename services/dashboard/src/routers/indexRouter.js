const express = require('express');
const router = express.Router();

const eventsController = require('../controllers/eventsController');
const indexController = require('../controllers/indexController');
const { requireAuth, requireCompleteProfile } = require('../middleware/auth');

router.use(requireAuth);

// Profile completion page (must be before requireCompleteProfile)
router.get('/complete-profile', indexController.completeProfilePage);
router.post('/complete-profile', indexController.completeProfile);

// Apply profile completion check for all other routes
router.use(requireCompleteProfile);

router.get('/', eventsController.home);

module.exports = router;