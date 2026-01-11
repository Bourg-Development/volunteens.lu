const express = require('express');
const router = express.Router();
const eventsController = require('./eventsController');
const shiftsRoutes = require('../shifts/shiftsRoutes');
const { requireAuth, requireOrganization, requireAdmin } = require('../../../middleware/auth');
const { createEventLimiter } = require('../../../middleware/rateLimiter');

// Public routes
router.get('/public', eventsController.listPublic);
router.get('/public/:eventId', eventsController.getPublic);

// Organization routes
router.get('/my', requireOrganization, eventsController.listMyEvents);
router.post('/', requireOrganization, createEventLimiter, eventsController.create);
router.put('/:eventId', requireOrganization, eventsController.update);
router.post('/:eventId/publish', requireOrganization, eventsController.publish);
router.post('/:eventId/cancel', requireOrganization, eventsController.cancel);
router.delete('/:eventId', requireOrganization, eventsController.delete);

// Shifts routes (nested under events)
router.use('/:eventId/shifts', shiftsRoutes);

// Admin routes
router.get('/admin', eventsController.listAllAdmin);
router.get('/admin/:eventId', eventsController.getEventAdmin);
router.patch('/admin/:eventId/status', eventsController.updateStatusAdmin);
router.delete('/admin/:eventId', eventsController.deleteAdmin);

module.exports = router;
