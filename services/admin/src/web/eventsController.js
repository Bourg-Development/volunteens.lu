const servicesConfig = require('../config/services');
const logger = require('../utils/logger');

const EVENTS_URL = servicesConfig.events;

async function fetchEvents(query = '') {
    const response = await fetch(`${EVENTS_URL}/api/v1/events/admin${query}`, {
        headers: { 'Content-Type': 'application/json' },
    });
    return response.json();
}

async function fetchEvent(eventId) {
    const response = await fetch(`${EVENTS_URL}/api/v1/events/admin/${eventId}`, {
        headers: { 'Content-Type': 'application/json' },
    });
    return response.json();
}

exports.eventsPage = async (req, res) => {
    try {
        const { status, page = 1 } = req.query;
        let query = `?page=${page}`;
        if (status) query += `&status=${status}`;

        const data = await fetchEvents(query);

        res.render('pages/events', {
            title: 'Events Management',
            user: req.user,
            authUrl: servicesConfig.auth,
            events: data.events || [],
            total: data.total || 0,
            page: data.page || 1,
            totalPages: data.totalPages || 1,
            currentStatus: status || 'all',
            msg: req.query.msg,
            success: req.query.success === '1',
        });
    } catch (err) {
        logger.error('Events page error:', err);
        res.render('pages/events', {
            title: 'Events Management',
            user: req.user,
            authUrl: servicesConfig.auth,
            events: [],
            total: 0,
            page: 1,
            totalPages: 1,
            currentStatus: 'all',
            msg: 'Error loading events',
            success: false,
        });
    }
};

exports.eventDetail = async (req, res) => {
    try {
        const data = await fetchEvent(req.params.eventId);

        if (!data.success || !data.event) {
            return res.redirect('/events?msg=Event not found&success=0');
        }

        res.render('pages/event-detail', {
            title: 'Event Details',
            user: req.user,
            authUrl: servicesConfig.auth,
            event: data.event,
            signups: data.event.signups || [],
            msg: req.query.msg,
            success: req.query.success === '1',
        });
    } catch (err) {
        logger.error('Event detail error:', err);
        res.redirect('/events?msg=Error loading event&success=0');
    }
};

exports.updateEventStatus = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { status } = req.body;

        const response = await fetch(`${EVENTS_URL}/api/v1/events/admin/${eventId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });

        const data = await response.json();

        if (!data.success) {
            return res.redirect(`/events/${eventId}?msg=${encodeURIComponent(data.error || 'Failed to update status')}&success=0`);
        }

        logger.info(`Event ${eventId} status updated to ${status} by ${req.user.email}`);
        res.redirect(`/events/${eventId}?msg=Event status updated to ${status}&success=1`);
    } catch (err) {
        logger.error('Update event status error:', err);
        res.redirect(`/events/${req.params.eventId}?msg=Error updating status&success=0`);
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const { eventId } = req.params;

        const response = await fetch(`${EVENTS_URL}/api/v1/events/admin/${eventId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (!data.success) {
            return res.redirect(`/events/${eventId}?msg=${encodeURIComponent(data.error || 'Failed to delete event')}&success=0`);
        }

        logger.info(`Event ${eventId} deleted by ${req.user.email}`);
        res.redirect('/events?msg=Event deleted successfully&success=1');
    } catch (err) {
        logger.error('Delete event error:', err);
        res.redirect(`/events?msg=Error deleting event&success=0`);
    }
};
