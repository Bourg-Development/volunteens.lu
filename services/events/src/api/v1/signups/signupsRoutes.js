const express = require('express');
const router = express.Router();
const signupsController = require('./signupsController');
const { requireAuth, requireStudent, requireOrganization } = require('../../../middleware/auth');
const { signupLimiter } = require('../../../middleware/rateLimiter');

// Student routes
router.get('/my', requireStudent, signupsController.mySignups);
router.post('/event/:eventId', requireStudent, signupLimiter, signupsController.signup);
router.delete('/event/:eventId', requireStudent, signupsController.cancel);

// Organization routes (manage signups for own events)
router.get('/event/:eventId', requireOrganization, signupsController.listEventSignups);
router.put('/event/:eventId/:signupId', requireOrganization, signupsController.updateStatus);

module.exports = router;
