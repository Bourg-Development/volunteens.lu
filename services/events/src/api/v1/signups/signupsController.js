const { Event, Signup, Shift, ShiftAssignment, EVENT_STATUSES, SIGNUP_STATUSES, ASSIGNMENT_STATUSES } = require('../../../database');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');
const emailClient = require('../../../services/emailClient');

// Student: sign up for event
exports.signup = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { message } = req.body;

        const event = await Event.findByPk(eventId, {
            include: [
                {
                    model: Signup,
                    as: 'signups',
                    where: { status: { [Op.ne]: SIGNUP_STATUSES.CANCELLED } },
                    required: false,
                },
                {
                    model: Shift,
                    as: 'shifts',
                    attributes: ['id', 'date', 'startTime', 'endTime'],
                },
            ],
        });

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        if (event.status !== EVENT_STATUSES.PUBLISHED) {
            return res.status(400).json({ success: false, error: 'Event is not open for signups' });
        }

        // Check if all shifts have passed
        const today = new Date().toISOString().split('T')[0];
        const hasUpcomingShifts = event.shifts?.some(s => s.date >= today);
        if (!hasUpcomingShifts) {
            return res.status(400).json({ success: false, error: 'Event has already passed' });
        }

        // Check signup deadline
        if (event.signupDeadline && new Date(event.signupDeadline) < new Date()) {
            return res.status(400).json({ success: false, error: 'Signup deadline has passed' });
        }

        // Check capacity
        const currentSignups = event.signups?.length || 0;
        if (event.capacity && currentSignups >= event.capacity) {
            return res.status(400).json({ success: false, error: 'Event is full' });
        }

        // Check if already signed up
        const existingSignup = await Signup.findOne({
            where: { eventId, studentId: req.user.id },
        });

        if (existingSignup) {
            if (existingSignup.status === SIGNUP_STATUSES.CANCELLED) {
                // Re-activate cancelled signup
                await existingSignup.update({
                    status: SIGNUP_STATUSES.PENDING,
                    message,
                });
                return res.json({ success: true, signup: existingSignup });
            }
            return res.status(400).json({ success: false, error: 'Already signed up for this event' });
        }

        const signup = await Signup.create({
            eventId,
            studentId: req.user.id,
            studentEmail: req.user.email,
            studentName: req.user.name || null,
            message,
            status: SIGNUP_STATUSES.PENDING,
        });

        logger.info(`Signup created: ${signup.id} for event ${eventId} by ${req.user.email}`);

        // Send emails asynchronously (don't block response)
        // Format shifts for email
        const shiftDates = event.shifts?.map(s => {
            const date = new Date(s.date);
            return date.toLocaleDateString('en-GB', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            }) + ` ${s.startTime.substring(0, 5)} - ${s.endTime.substring(0, 5)}`;
        }).join(', ') || 'TBD';

        emailClient.sendSignupConfirmation({
            to: req.user.email,
            studentName: req.user.name || req.user.email,
            eventTitle: event.title,
            eventDate: shiftDates,
            eventLocation: event.location,
        }).catch(err => logger.error('Failed to send signup confirmation email:', err));

        if (event.contactEmail) {
            emailClient.sendSignupNotificationToOrg({
                to: event.contactEmail,
                studentName: req.user.name || req.user.email,
                studentEmail: req.user.email,
                eventTitle: event.title,
                eventId: event.id,
                message,
            }).catch(err => logger.error('Failed to send signup notification email:', err));
        }

        res.status(201).json({ success: true, signup });
    } catch (err) {
        logger.error('Error signing up for event:', err);
        res.status(500).json({ success: false, error: 'Failed to sign up' });
    }
};

// Student: cancel own signup
exports.cancel = async (req, res) => {
    try {
        const { eventId } = req.params;

        const signup = await Signup.findOne({
            where: { eventId, studentId: req.user.id },
            include: [{ model: Event, as: 'event' }],
        });

        if (!signup) {
            return res.status(404).json({ success: false, error: 'Signup not found' });
        }

        await signup.update({ status: SIGNUP_STATUSES.CANCELLED });

        logger.info(`Signup cancelled: ${signup.id} by ${req.user.email}`);

        // Send cancellation notification to organization
        if (signup.event?.contactEmail) {
            emailClient.sendSignupCancellation({
                to: signup.event.contactEmail,
                studentName: req.user.name || req.user.email,
                eventTitle: signup.event.title,
            }).catch(err => logger.error('Failed to send cancellation email:', err));
        }

        res.json({ success: true, message: 'Signup cancelled' });
    } catch (err) {
        logger.error('Error cancelling signup:', err);
        res.status(500).json({ success: false, error: 'Failed to cancel signup' });
    }
};

// Student: list my signups
exports.mySignups = async (req, res) => {
    try {
        const signups = await Signup.findAll({
            where: { studentId: req.user.id },
            include: [
                {
                    model: Event,
                    as: 'event',
                    attributes: ['id', 'title', 'location', 'status'],
                    include: [{
                        model: Shift,
                        as: 'shifts',
                        attributes: ['id', 'date', 'startTime', 'endTime'],
                    }],
                },
                {
                    model: ShiftAssignment,
                    as: 'shiftAssignments',
                    attributes: ['id', 'shiftId', 'status'],
                    include: [{
                        model: Shift,
                        as: 'shift',
                        attributes: ['id', 'date', 'startTime', 'endTime'],
                    }],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json({ success: true, signups });
    } catch (err) {
        logger.error('Error fetching my signups:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch signups' });
    }
};

// Organization: list signups for own event
exports.listEventSignups = async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // Only owner or admin can view signups
        if (event.organizationId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        const signups = await Signup.findAll({
            where: { eventId },
            order: [['createdAt', 'ASC']],
        });

        res.json({ success: true, signups, event: { id: event.id, title: event.title } });
    } catch (err) {
        logger.error('Error fetching event signups:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch signups' });
    }
};

// Organization: update signup status (confirm, cancel)
// Note: Attendance is now tracked per-shift via ShiftAssignment, not here
exports.updateStatus = async (req, res) => {
    try {
        const { eventId, signupId } = req.params;
        const { status, notes } = req.body;

        const event = await Event.findByPk(eventId);
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        if (event.organizationId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        const signup = await Signup.findOne({
            where: { id: signupId, eventId },
        });

        if (!signup) {
            return res.status(404).json({ success: false, error: 'Signup not found' });
        }

        const validStatuses = Object.values(SIGNUP_STATUSES);
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        const previousStatus = signup.status;

        await signup.update({
            status: status ?? signup.status,
            notes: notes ?? signup.notes,
        });

        logger.info(`Signup ${signupId} updated to ${status} by ${req.user.email}`);

        // Send status update email to student if status changed
        if (status && status !== previousStatus && signup.studentEmail) {
            emailClient.sendSignupStatusUpdate({
                to: signup.studentEmail,
                studentName: signup.studentName || signup.studentEmail,
                eventTitle: event.title,
                status,
                notes,
            }).catch(err => logger.error('Failed to send status update email:', err));
        }

        res.json({ success: true, signup });
    } catch (err) {
        logger.error('Error updating signup:', err);
        res.status(500).json({ success: false, error: 'Failed to update signup' });
    }
};
