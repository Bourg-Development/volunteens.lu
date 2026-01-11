const express = require('express');
const router = express.Router({ mergeParams: true });
const shiftsController = require('./shiftsController');
const { requireAuth, requireOrganization } = require('../../../middleware/auth');

// All routes require authentication and organization role
router.use(requireAuth);
router.use(requireOrganization);

// Get event shifts overview (for management page)
router.get('/', shiftsController.getEventShifts);

// Generate invoices for all attended shifts
router.post('/generate-invoices', shiftsController.generateInvoices);

// Get assignments for a specific shift
router.get('/:shiftId/assignments', shiftsController.getAssignments);

// Assign students to a shift
router.post('/:shiftId/assignments', shiftsController.assignStudents);

// Remove an assignment
router.delete('/:shiftId/assignments/:assignmentId', shiftsController.removeAssignment);

// Update assignment status (attendance)
router.patch('/:shiftId/assignments/:assignmentId', shiftsController.updateAssignmentStatus);

// Bulk update attendance for a shift
router.post('/:shiftId/assignments/bulk-status', shiftsController.bulkUpdateStatus);

module.exports = router;
