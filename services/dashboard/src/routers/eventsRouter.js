const express = require('express');
const router = express.Router();

const eventsController = require('../controllers/eventsController');
const { requireAuth, requireOrganization, requireStudent, requireCompleteProfile } = require('../middleware/auth');

// All routes require authentication and complete profile
router.use(requireAuth);
router.use(requireCompleteProfile);

// ==========================================
// Shared Route - /events routes based on role
// ==========================================

router.get('/events', (req, res, next) => {
    if (req.user.role === 'organization') {
        return eventsController.orgEvents(req, res, next);
    } else if (req.user.role === 'student') {
        return eventsController.studentEvents(req, res, next);
    }
    res.redirect('/');
});

// ==========================================
// Organization Routes
// ==========================================

// Create event form
router.get('/events/create', requireOrganization, eventsController.orgCreateForm);

// Create event
router.post('/events/create', requireOrganization, eventsController.orgCreate);

// Event detail pages (sub-navigation)
router.get('/events/:eventId', requireOrganization, eventsController.orgEventOverview);
router.get('/events/:eventId/signups', requireOrganization, eventsController.orgSignups);
router.get('/events/:eventId/shifts', requireOrganization, eventsController.orgManageShifts);
router.get('/events/:eventId/attendance', requireOrganization, eventsController.orgAttendance);

// Edit event form
router.get('/events/:eventId/edit', requireOrganization, eventsController.orgEditForm);

// Update event
router.post('/events/:eventId/edit', requireOrganization, eventsController.orgUpdate);

// Publish event
router.post('/events/:eventId/publish', requireOrganization, eventsController.orgPublish);

// Cancel event
router.post('/events/:eventId/cancel', requireOrganization, eventsController.orgCancel);

// Delete event
router.post('/events/:eventId/delete', requireOrganization, eventsController.orgDelete);

// Update signup status
router.post('/events/:eventId/signups/:signupId', requireOrganization, eventsController.orgUpdateSignup);

// Assign students to shift
router.post('/events/:eventId/shifts/:shiftId/assign', requireOrganization, eventsController.orgAssignShift);

// Update attendance for shift
router.post('/events/:eventId/shifts/:shiftId/attendance', requireOrganization, eventsController.orgUpdateAttendance);

// Remove assignment from shift
router.delete('/events/:eventId/shifts/:shiftId/assignments/:assignmentId', requireOrganization, eventsController.orgRemoveAssignment);

// Generate invoices
router.post('/events/:eventId/generate-invoices', requireOrganization, eventsController.orgGenerateInvoices);

// Download attendance list as PDF
router.get('/events/:eventId/attendance/download', requireOrganization, eventsController.orgDownloadAttendanceList);

// ==========================================
// Student Routes
// ==========================================

// View single event
router.get('/event/:eventId', requireStudent, eventsController.studentViewEvent);

// Sign up for event
router.post('/event/:eventId/signup', requireStudent, eventsController.studentSignup);

// Cancel signup
router.post('/event/:eventId/cancel', requireStudent, eventsController.studentCancelSignup);

module.exports = router;
