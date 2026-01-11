const { Event, Signup, Shift, ShiftAssignment, EVENT_STATUSES, SIGNUP_STATUSES, ASSIGNMENT_STATUSES } = require('../../../database');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');

// Helper to get earliest shift date from shifts array
function getEarliestShiftDate(shifts) {
    if (!shifts || shifts.length === 0) return null;
    return shifts.reduce((earliest, shift) => {
        const d = new Date(shift.date);
        return d < earliest ? d : earliest;
    }, new Date(shifts[0].date));
}

// Helper to calculate default signup deadline (5 days before first shift)
function getDefaultDeadline(shifts) {
    const earliest = getEarliestShiftDate(shifts);
    if (!earliest) return null;
    const deadline = new Date(earliest);
    deadline.setDate(deadline.getDate() - 5);
    return deadline;
}

// Get all published events (public)
exports.listPublic = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const today = new Date().toISOString().split('T')[0];

        const events = await Event.findAndCountAll({
            where: {
                status: EVENT_STATUSES.PUBLISHED,
            },
            attributes: ['id', 'organizationId', 'title', 'description', 'location', 'capacity', 'signupDeadline', 'createdAt'],
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [
                {
                    model: Signup,
                    as: 'signups',
                    attributes: ['id'],
                    where: { status: { [Op.ne]: SIGNUP_STATUSES.CANCELLED } },
                    required: false,
                },
                {
                    model: Shift,
                    as: 'shifts',
                    attributes: ['id', 'date', 'startTime', 'endTime'],
                    where: { date: { [Op.gte]: today } },
                    required: true,
                },
            ],
            order: [[{ model: Shift, as: 'shifts' }, 'date', 'ASC']],
            distinct: true,
        });

        const eventsWithCount = events.rows.map(event => ({
            ...event.toJSON(),
            signupCount: event.signups?.length || 0,
            signups: undefined,
        }));

        res.json({
            success: true,
            events: eventsWithCount,
            total: events.count,
            page: parseInt(page),
            totalPages: Math.ceil(events.count / limit),
        });
    } catch (err) {
        logger.error('Error fetching public events:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch events' });
    }
};

// Get single event (public)
exports.getPublic = async (req, res) => {
    try {
        const event = await Event.findOne({
            where: {
                id: req.params.eventId,
                status: EVENT_STATUSES.PUBLISHED,
            },
            include: [
                {
                    model: Signup,
                    as: 'signups',
                    attributes: ['id'],
                    where: { status: { [Op.ne]: SIGNUP_STATUSES.CANCELLED } },
                    required: false,
                },
                {
                    model: Shift,
                    as: 'shifts',
                    attributes: ['id', 'date', 'startTime', 'endTime'],
                    order: [['date', 'ASC'], ['startTime', 'ASC']],
                },
            ],
        });

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        res.json({
            success: true,
            event: {
                ...event.toJSON(),
                signupCount: event.signups?.length || 0,
                signups: undefined,
            },
        });
    } catch (err) {
        logger.error('Error fetching event:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch event' });
    }
};

// List events for organization (own events)
exports.listMyEvents = async (req, res) => {
    try {
        const events = await Event.findAll({
            where: { organizationId: req.user.id },
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: Signup,
                    as: 'signups',
                    attributes: ['id', 'status'],
                },
                {
                    model: Shift,
                    as: 'shifts',
                    attributes: ['id', 'date', 'startTime', 'endTime'],
                },
            ],
        });

        const eventsWithStats = events.map(event => ({
            ...event.toJSON(),
            signupCount: event.signups?.filter(s => s.status !== SIGNUP_STATUSES.CANCELLED).length || 0,
            signups: undefined,
        }));

        res.json({ success: true, events: eventsWithStats });
    } catch (err) {
        logger.error('Error fetching org events:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch events' });
    }
};

// Create event (organization)
exports.create = async (req, res) => {
    try {
        const { title, description, location, address, capacity, requirements, contactEmail, contactPhone, signupDeadline, shifts } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }

        if (!shifts || !Array.isArray(shifts) || shifts.length === 0) {
            return res.status(400).json({ success: false, error: 'At least one shift is required' });
        }

        // Validate shifts
        for (const shift of shifts) {
            if (!shift.date || !shift.startTime || !shift.endTime) {
                return res.status(400).json({ success: false, error: 'Each shift must have date, startTime, and endTime' });
            }
        }

        // Use provided deadline or default to 5 days before first shift
        const deadline = signupDeadline || getDefaultDeadline(shifts);

        const event = await Event.create({
            organizationId: req.user.id,
            title,
            description: description || null,
            location: location || null,
            address: address || null,
            capacity: capacity ? parseInt(capacity, 10) : null,
            requirements: requirements || null,
            contactEmail: contactEmail || null,
            contactPhone: contactPhone || null,
            signupDeadline: deadline,
            status: EVENT_STATUSES.DRAFT,
        });

        // Create shifts
        const shiftRecords = await Shift.bulkCreate(
            shifts.map(s => ({
                eventId: event.id,
                date: s.date,
                startTime: s.startTime,
                endTime: s.endTime,
            }))
        );

        logger.info(`Event created: ${event.id} with ${shiftRecords.length} shifts by ${req.user.email}`);

        // Return event with shifts
        const eventWithShifts = await Event.findByPk(event.id, {
            include: [{ model: Shift, as: 'shifts' }],
        });

        res.status(201).json({ success: true, event: eventWithShifts });
    } catch (err) {
        logger.error('Error creating event:', err);
        res.status(500).json({ success: false, error: 'Failed to create event' });
    }
};

// Update event (organization - own events only)
exports.update = async (req, res) => {
    try {
        const event = await Event.findByPk(req.params.eventId, {
            include: [{ model: Shift, as: 'shifts' }],
        });

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // Only owner or admin can edit
        if (event.organizationId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Not authorized to edit this event' });
        }

        const { title, description, location, address, capacity, requirements, contactEmail, contactPhone, signupDeadline, shifts } = req.body;

        // Validate shifts if provided
        if (shifts) {
            if (!Array.isArray(shifts) || shifts.length === 0) {
                return res.status(400).json({ success: false, error: 'At least one shift is required' });
            }
            for (const shift of shifts) {
                if (!shift.date || !shift.startTime || !shift.endTime) {
                    return res.status(400).json({ success: false, error: 'Each shift must have date, startTime, and endTime' });
                }
            }
        }

        // Calculate deadline based on new or existing shifts
        const shiftData = shifts || event.shifts.map(s => ({ date: s.date }));
        const deadline = signupDeadline || getDefaultDeadline(shiftData);

        await event.update({
            title: title || event.title,
            description: description !== undefined ? description : event.description,
            location: location !== undefined ? location : event.location,
            address: address !== undefined ? address : event.address,
            capacity: capacity !== undefined ? (capacity ? parseInt(capacity, 10) : null) : event.capacity,
            requirements: requirements !== undefined ? requirements : event.requirements,
            contactEmail: contactEmail !== undefined ? contactEmail : event.contactEmail,
            contactPhone: contactPhone !== undefined ? contactPhone : event.contactPhone,
            signupDeadline: deadline,
        });

        // Update shifts if provided (delete existing, create new)
        if (shifts) {
            await Shift.destroy({ where: { eventId: event.id } });
            await Shift.bulkCreate(
                shifts.map(s => ({
                    eventId: event.id,
                    date: s.date,
                    startTime: s.startTime,
                    endTime: s.endTime,
                }))
            );
        }

        logger.info(`Event updated: ${event.id} by ${req.user.email}`);

        // Return updated event with shifts
        const updatedEvent = await Event.findByPk(event.id, {
            include: [{ model: Shift, as: 'shifts' }],
        });

        res.json({ success: true, event: updatedEvent });
    } catch (err) {
        logger.error('Error updating event:', err);
        res.status(500).json({ success: false, error: 'Failed to update event' });
    }
};

// Publish event (organization)
exports.publish = async (req, res) => {
    try {
        const event = await Event.findByPk(req.params.eventId);

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        if (event.organizationId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        if (event.status !== EVENT_STATUSES.DRAFT) {
            return res.status(400).json({ success: false, error: 'Only draft events can be published' });
        }

        await event.update({ status: EVENT_STATUSES.PUBLISHED });

        logger.info(`Event published: ${event.id} by ${req.user.email}`);

        res.json({ success: true, event });
    } catch (err) {
        logger.error('Error publishing event:', err);
        res.status(500).json({ success: false, error: 'Failed to publish event' });
    }
};

// Cancel event (organization or admin)
exports.cancel = async (req, res) => {
    try {
        const event = await Event.findByPk(req.params.eventId);

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        if (event.organizationId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        await event.update({ status: EVENT_STATUSES.CANCELLED });

        logger.info(`Event cancelled: ${event.id} by ${req.user.email}`);

        res.json({ success: true, event });
    } catch (err) {
        logger.error('Error cancelling event:', err);
        res.status(500).json({ success: false, error: 'Failed to cancel event' });
    }
};

// Delete event (organization or admin)
exports.delete = async (req, res) => {
    try {
        const event = await Event.findByPk(req.params.eventId);

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        if (event.organizationId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        await event.destroy();

        logger.info(`Event deleted: ${req.params.eventId} by ${req.user.email}`);

        res.json({ success: true, message: 'Event deleted' });
    } catch (err) {
        logger.error('Error deleting event:', err);
        res.status(500).json({ success: false, error: 'Failed to delete event' });
    }
};

// Admin: list all events
exports.listAll = async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (status) where.status = status;

        const events = await Event.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [
                {
                    model: Signup,
                    as: 'signups',
                    attributes: ['id', 'status'],
                },
                {
                    model: Shift,
                    as: 'shifts',
                    attributes: ['id', 'date', 'startTime', 'endTime'],
                },
            ],
            distinct: true,
        });

        const eventsWithStats = events.rows.map(event => ({
            ...event.toJSON(),
            signupCount: event.signups?.filter(s => s.status !== SIGNUP_STATUSES.CANCELLED).length || 0,
            signups: undefined,
        }));

        res.json({
            success: true,
            events: eventsWithStats,
            total: events.count,
            page: parseInt(page),
            totalPages: Math.ceil(events.count / limit),
        });
    } catch (err) {
        logger.error('Error fetching all events:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch events' });
    }
};

// Admin: list all events (alias)
exports.listAllAdmin = exports.listAll;

// Admin: get single event with signups
exports.getEventAdmin = async (req, res) => {
    try {
        const event = await Event.findByPk(req.params.eventId, {
            include: [
                {
                    model: Signup,
                    as: 'signups',
                    attributes: ['id', 'studentId', 'studentName', 'studentEmail', 'status', 'createdAt'],
                    include: [{
                        model: ShiftAssignment,
                        as: 'shiftAssignments',
                        attributes: ['id', 'shiftId', 'status'],
                    }],
                },
                {
                    model: Shift,
                    as: 'shifts',
                    attributes: ['id', 'date', 'startTime', 'endTime'],
                    include: [{
                        model: ShiftAssignment,
                        as: 'assignments',
                        attributes: ['id', 'signupId', 'status'],
                    }],
                },
            ],
        });

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        res.json({ success: true, event, signups: event.signups || [], shifts: event.shifts || [] });
    } catch (err) {
        logger.error('Error fetching event for admin:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch event' });
    }
};

// Admin: update event status
exports.updateStatusAdmin = async (req, res) => {
    try {
        const { status } = req.body;
        const event = await Event.findByPk(req.params.eventId);

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        if (!Object.values(EVENT_STATUSES).includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        await event.update({ status });

        logger.info(`Admin updated event status: ${event.id} to ${status}`);

        res.json({ success: true, event });
    } catch (err) {
        logger.error('Error updating event status:', err);
        res.status(500).json({ success: false, error: 'Failed to update event status' });
    }
};

// Admin: delete event
exports.deleteAdmin = async (req, res) => {
    try {
        const event = await Event.findByPk(req.params.eventId);

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        await event.destroy();

        logger.info(`Admin deleted event: ${req.params.eventId}`);

        res.json({ success: true, message: 'Event deleted' });
    } catch (err) {
        logger.error('Error deleting event:', err);
        res.status(500).json({ success: false, error: 'Failed to delete event' });
    }
};
