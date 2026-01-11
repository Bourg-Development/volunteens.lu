const express = require('express');
const router = express.Router();
const indexController = require('../web/indexController');
const eventsController = require('../web/eventsController');
const settingsController = require('../web/settingsController');
const { requireAdmin } = require('../middleware/auth');

// All routes require admin
router.use(requireAdmin);

router.get('/', indexController.dashboard);

// Settings
router.get('/settings', settingsController.settingsPage);
router.post('/settings/:key', settingsController.updateSetting);
router.get('/pending', indexController.pending);
router.get('/users', indexController.usersPage);
router.get('/users/create', indexController.createUserPage);
router.post('/users/create', indexController.createUser);
router.get('/users/:userId', indexController.userDetail);
router.post('/users/:userId/approve', indexController.approveUser);
router.post('/users/:userId/reject', indexController.rejectUser);
router.post('/users/:userId/role', indexController.updateRole);
router.post('/users/:userId/status', indexController.updateStatus);

// Events management
router.get('/events', eventsController.eventsPage);
router.get('/events/:eventId', eventsController.eventDetail);
router.post('/events/:eventId/status', eventsController.updateEventStatus);
router.post('/events/:eventId/delete', eventsController.deleteEvent);

module.exports = router;
