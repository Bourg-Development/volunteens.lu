const { Event, Signup, Shift, ShiftAssignment, SIGNUP_STATUSES, ASSIGNMENT_STATUSES } = require('../../../database');
const logger = require('../../../utils/logger');
const paymentClient = require('../../../services/paymentClient');
const emailClient = require('../../../services/emailClient');
const services = require('../../../config/services');

// Get all assignments for a shift
exports.getAssignments = async (req, res) => {
    try {
        const { eventId, shiftId } = req.params;

        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // Check authorization
        if (event.organizationId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        const shift = await Shift.findOne({
            where: { id: shiftId, eventId },
            include: [{
                model: ShiftAssignment,
                as: 'assignments',
                include: [{
                    model: Signup,
                    as: 'signup',
                    attributes: ['id', 'studentId', 'studentName', 'studentEmail', 'status'],
                }],
            }],
        });

        if (!shift) {
            return res.status(404).json({ success: false, error: 'Shift not found' });
        }

        res.json({ success: true, shift, assignments: shift.assignments || [] });
    } catch (err) {
        logger.error('Error fetching shift assignments:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch assignments' });
    }
};

// Assign students to a shift
exports.assignStudents = async (req, res) => {
    try {
        const { eventId, shiftId } = req.params;
        const { signupIds } = req.body;

        if (!signupIds || !Array.isArray(signupIds) || signupIds.length === 0) {
            return res.status(400).json({ success: false, error: 'signupIds array is required' });
        }

        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // Check authorization
        if (event.organizationId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        const shift = await Shift.findOne({ where: { id: shiftId, eventId } });
        if (!shift) {
            return res.status(404).json({ success: false, error: 'Shift not found' });
        }

        // Verify all signups are confirmed and belong to this event
        const signups = await Signup.findAll({
            where: {
                id: signupIds,
                eventId,
                status: SIGNUP_STATUSES.CONFIRMED,
            },
        });

        if (signups.length !== signupIds.length) {
            return res.status(400).json({ success: false, error: 'Some signups are not confirmed or do not belong to this event' });
        }

        // Create assignments (ignore duplicates)
        const assignments = [];
        const newlyAssignedSignups = [];
        for (const signupId of signupIds) {
            try {
                const [assignment, created] = await ShiftAssignment.findOrCreate({
                    where: { shiftId, signupId },
                    defaults: { status: ASSIGNMENT_STATUSES.ASSIGNED },
                });
                assignments.push(assignment);
                if (created) {
                    // Find the signup for this assignment
                    const signup = signups.find(s => s.id === signupId);
                    if (signup) {
                        newlyAssignedSignups.push(signup);
                    }
                }
            } catch (err) {
                // Ignore duplicate errors
                if (err.name !== 'SequelizeUniqueConstraintError') {
                    throw err;
                }
            }
        }

        logger.info(`Assigned ${assignments.length} students to shift ${shiftId} by ${req.user.email}`);

        // Send email notifications to newly assigned students
        const shiftDate = new Date(shift.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        for (const signup of newlyAssignedSignups) {
            emailClient.sendShiftAssignment({
                to: signup.studentEmail,
                studentName: signup.studentName,
                eventTitle: event.title,
                eventLocation: event.location || null,
                shiftDate,
                shiftStartTime: shift.startTime.substring(0, 5),
                shiftEndTime: shift.endTime.substring(0, 5),
                dashboardUrl: services.dash,
            }).catch(err => logger.error(`Failed to send shift assignment email to ${signup.studentEmail}:`, err));
        }

        res.json({ success: true, assignments });
    } catch (err) {
        logger.error('Error assigning students:', err);
        res.status(500).json({ success: false, error: 'Failed to assign students' });
    }
};

// Remove assignment
exports.removeAssignment = async (req, res) => {
    try {
        const { eventId, shiftId, assignmentId } = req.params;

        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // Check authorization
        if (event.organizationId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        const assignment = await ShiftAssignment.findOne({
            where: { id: assignmentId, shiftId },
        });

        if (!assignment) {
            return res.status(404).json({ success: false, error: 'Assignment not found' });
        }

        await assignment.destroy();

        logger.info(`Removed assignment ${assignmentId} by ${req.user.email}`);

        res.json({ success: true, message: 'Assignment removed' });
    } catch (err) {
        logger.error('Error removing assignment:', err);
        res.status(500).json({ success: false, error: 'Failed to remove assignment' });
    }
};

// Update assignment status (attendance)
exports.updateAssignmentStatus = async (req, res) => {
    try {
        const { eventId, shiftId, assignmentId } = req.params;
        const { status } = req.body;

        if (!Object.values(ASSIGNMENT_STATUSES).includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // Check authorization
        if (event.organizationId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        const assignment = await ShiftAssignment.findOne({
            where: { id: assignmentId, shiftId },
            include: [{ model: Signup, as: 'signup' }],
        });

        if (!assignment) {
            return res.status(404).json({ success: false, error: 'Assignment not found' });
        }

        await assignment.update({ status });

        logger.info(`Updated assignment ${assignmentId} status to ${status} by ${req.user.email}`);

        res.json({ success: true, assignment });
    } catch (err) {
        logger.error('Error updating assignment status:', err);
        res.status(500).json({ success: false, error: 'Failed to update status' });
    }
};

// Bulk update attendance for a shift
exports.bulkUpdateStatus = async (req, res) => {
    try {
        const { eventId, shiftId } = req.params;
        const { assignments } = req.body;

        if (!assignments || !Array.isArray(assignments)) {
            return res.status(400).json({ success: false, error: 'assignments array is required' });
        }

        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // Check authorization
        if (event.organizationId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        const shift = await Shift.findOne({ where: { id: shiftId, eventId } });
        if (!shift) {
            return res.status(404).json({ success: false, error: 'Shift not found' });
        }

        // Update each assignment
        for (const { id, status } of assignments) {
            if (!Object.values(ASSIGNMENT_STATUSES).includes(status)) {
                continue;
            }
            await ShiftAssignment.update(
                { status },
                { where: { id, shiftId } }
            );
        }

        logger.info(`Bulk updated ${assignments.length} assignments for shift ${shiftId} by ${req.user.email}`);

        res.json({ success: true, message: 'Assignments updated' });
    } catch (err) {
        logger.error('Error bulk updating assignments:', err);
        res.status(500).json({ success: false, error: 'Failed to update assignments' });
    }
};

// Helper to calculate hours from a shift
function getShiftHours(shift) {
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return (endMinutes - startMinutes) / 60;
}

// Generate invoices for all attended shifts of an event
exports.generateInvoices = async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findByPk(eventId, {
            include: [
                {
                    model: Shift,
                    as: 'shifts',
                },
                {
                    model: Signup,
                    as: 'signups',
                    where: { status: SIGNUP_STATUSES.CONFIRMED },
                    required: false,
                    include: [{
                        model: ShiftAssignment,
                        as: 'shiftAssignments',
                        where: { status: ASSIGNMENT_STATUSES.ATTENDED },
                        required: false,
                        include: [{ model: Shift, as: 'shift' }],
                    }],
                },
            ],
        });

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // Check authorization
        if (event.organizationId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        const invoices = [];

        // For each signup with attended shifts, generate invoice
        for (const signup of event.signups || []) {
            const attendedAssignments = signup.shiftAssignments || [];
            if (attendedAssignments.length === 0) continue;

            // Calculate total hours from attended shifts
            let totalHours = 0;
            const attendedShifts = [];

            for (const assignment of attendedAssignments) {
                const hours = getShiftHours(assignment.shift);
                totalHours += hours;
                attendedShifts.push({
                    date: assignment.shift.date,
                    startTime: assignment.shift.startTime,
                    endTime: assignment.shift.endTime,
                    hours,
                });
            }

            // Create invoice via payment service
            try {
                const invoice = await paymentClient.createInvoice({
                    studentId: signup.studentId,
                    studentEmail: signup.studentEmail,
                    studentName: signup.studentName,
                    organizationId: event.organizationId,
                    organizationEmail: event.contactEmail || req.user.email,
                    organizationName: req.user.name || 'Organization',
                    eventId: event.id,
                    eventTitle: event.title,
                    signupId: signup.id,
                    hourlyRate: event.hourlyRate,
                    totalHours,
                    attendedShifts,
                });
                invoices.push(invoice);
            } catch (err) {
                logger.error(`Failed to create invoice for signup ${signup.id}:`, err);
            }
        }

        logger.info(`Generated ${invoices.length} invoices for event ${eventId} by ${req.user.email}`);

        res.json({ success: true, invoices, count: invoices.length });
    } catch (err) {
        logger.error('Error generating invoices:', err);
        res.status(500).json({ success: false, error: 'Failed to generate invoices' });
    }
};

// Get event with all shifts and assignments for management view
exports.getEventShifts = async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findByPk(eventId, {
            include: [
                {
                    model: Shift,
                    as: 'shifts',
                    include: [{
                        model: ShiftAssignment,
                        as: 'assignments',
                        include: [{
                            model: Signup,
                            as: 'signup',
                            attributes: ['id', 'studentId', 'studentName', 'studentEmail', 'status'],
                        }],
                    }],
                    order: [['date', 'ASC'], ['startTime', 'ASC']],
                },
                {
                    model: Signup,
                    as: 'signups',
                    where: { status: SIGNUP_STATUSES.CONFIRMED },
                    required: false,
                    attributes: ['id', 'studentId', 'studentName', 'studentEmail', 'status'],
                },
            ],
        });

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // Check authorization
        if (event.organizationId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        // Find confirmed signups not assigned to any shift
        const assignedSignupIds = new Set();
        for (const shift of event.shifts || []) {
            for (const assignment of shift.assignments || []) {
                assignedSignupIds.add(assignment.signupId);
            }
        }

        const unassignedSignups = (event.signups || []).filter(s => !assignedSignupIds.has(s.id));

        res.json({
            success: true,
            event,
            shifts: event.shifts || [],
            confirmedSignups: event.signups || [],
            unassignedSignups,
        });
    } catch (err) {
        logger.error('Error fetching event shifts:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch event shifts' });
    }
};
