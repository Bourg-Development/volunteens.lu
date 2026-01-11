const servicesConfig = require('../config/services');
const logger = require('../utils/logger');
const adminClient = require('../services/adminClient')
const PDFDocument = require('pdfkit');

const EVENTS_API = `${servicesConfig.eventsInternal}/api/v1`;

async function fetchEvents(endpoint, token, options = {}) {
    const response = await fetch(`${EVENTS_API}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    });
    return response.json();
}

// ==========================================
// Organization Controllers
// ==========================================

// List organization's events
exports.orgEvents = async (req, res) => {
    try {
        const data = await fetchEvents('/events/my', req.cookies.accessToken);
        res.render('pages/events/org-events', {
            title: 'My Events',
            user: req.user,
            events: data.events || [],
            error: data.success ? null : data.error,
        });
    } catch (err) {
        logger.error('Error fetching org events:', err);
        res.render('pages/events/org-events', {
            title: 'My Events',
            user: req.user,
            events: [],
            error: 'Failed to load events',
        });
    }
};

// Show create event form
exports.orgCreateForm = async (req, res) => {
    const payRecommendation = await adminClient.getHourlyRateRecommendation();
    res.render('pages/events/org-create', {
        title: 'Create Event',
        user: req.user,
        payRecommendation
    });
};

// Create event
exports.orgCreate = async (req, res) => {
    try {
        const data = await fetchEvents('/events', req.cookies.accessToken, {
            method: 'POST',
            body: JSON.stringify(req.body),
        });

        if (data.success) {
            res.redirect('/events?success=1&msg=' + encodeURIComponent('Event created successfully'));
        } else {
            res.render('pages/events/org-create', {
                title: 'Create Event',
                user: req.user,
                error: data.error,
                form: req.body,
            });
        }
    } catch (err) {
        logger.error('Error creating event:', err);
        res.render('pages/events/org-create', {
            title: 'Create Event',
            user: req.user,
            error: 'Failed to create event',
            form: req.body,
        });
    }
};

// Show edit event form
exports.orgEditForm = async (req, res) => {
    try {
        const data = await fetchEvents(`/events/my`, req.cookies.accessToken);
        const event = data.events?.find(e => e.id === req.params.eventId);

        if (!event) {
            return res.status(404).render('pages/error', {
                error: '404',
                title: 'Not Found',
                msg: 'Event not found',
            });
        }

        res.render('pages/events/org-edit', {
            title: 'Edit Event',
            user: req.user,
            event,
        });
    } catch (err) {
        logger.error('Error fetching event for edit:', err);
        res.status(500).render('pages/error', {
            error: '500',
            title: 'Error',
            msg: 'Failed to load event',
        });
    }
};

// Update event
exports.orgUpdate = async (req, res) => {
    try {
        const data = await fetchEvents(`/events/${req.params.eventId}`, req.cookies.accessToken, {
            method: 'PUT',
            body: JSON.stringify(req.body),
        });

        // Return JSON for AJAX requests
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json(data);
        }

        if (data.success) {
            res.redirect('/events?success=1&msg=' + encodeURIComponent('Event updated successfully'));
        } else {
            res.redirect(`/events/${req.params.eventId}/edit?error=` + encodeURIComponent(data.error));
        }
    } catch (err) {
        logger.error('Error updating event:', err);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, error: 'Failed to update event' });
        }
        res.redirect(`/events/${req.params.eventId}/edit?error=` + encodeURIComponent('Failed to update event'));
    }
};

// Publish event
exports.orgPublish = async (req, res) => {
    try {
        const data = await fetchEvents(`/events/${req.params.eventId}/publish`, req.cookies.accessToken, {
            method: 'POST',
        });

        if (data.success) {
            res.redirect('/events?success=1&msg=' + encodeURIComponent('Event published successfully'));
        } else {
            res.redirect('/events?error=' + encodeURIComponent(data.error));
        }
    } catch (err) {
        logger.error('Error publishing event:', err);
        res.redirect('/events?error=' + encodeURIComponent('Failed to publish event'));
    }
};

// Cancel event
exports.orgCancel = async (req, res) => {
    try {
        const data = await fetchEvents(`/events/${req.params.eventId}/cancel`, req.cookies.accessToken, {
            method: 'POST',
        });

        if (data.success) {
            res.redirect('/events?success=1&msg=' + encodeURIComponent('Event cancelled'));
        } else {
            res.redirect('/events?error=' + encodeURIComponent(data.error));
        }
    } catch (err) {
        logger.error('Error cancelling event:', err);
        res.redirect('/events?error=' + encodeURIComponent('Failed to cancel event'));
    }
};

// Delete event
exports.orgDelete = async (req, res) => {
    try {
        const data = await fetchEvents(`/events/${req.params.eventId}`, req.cookies.accessToken, {
            method: 'DELETE',
        });

        if (data.success) {
            res.redirect('/events?success=1&msg=' + encodeURIComponent('Event deleted'));
        } else {
            res.redirect('/events?error=' + encodeURIComponent(data.error));
        }
    } catch (err) {
        logger.error('Error deleting event:', err);
        res.redirect('/events?error=' + encodeURIComponent('Failed to delete event'));
    }
};

// View signups for an event
exports.orgSignups = async (req, res) => {
    try {
        const data = await fetchEvents(`/signups/event/${req.params.eventId}`, req.cookies.accessToken);

        if (!data.success) {
            return res.status(404).render('pages/error', {
                error: '404',
                title: 'Not Found',
                msg: data.error || 'Event not found',
            });
        }

        res.render('pages/events/org-signups', {
            title: `Signups - ${data.event?.title}`,
            user: req.user,
            currentEvent: data.event,
            activeSubNav: 'signups',
            event: data.event,
            signups: data.signups || [],
            success: req.query.success === '1',
            error: req.query.error || null,
            msg: req.query.msg || null,
        });
    } catch (err) {
        logger.error('Error fetching signups:', err);
        res.status(500).render('pages/error', {
            error: '500',
            title: 'Error',
            msg: 'Failed to load signups',
        });
    }
};

// Update signup status
exports.orgUpdateSignup = async (req, res) => {
    try {
        const { eventId, signupId } = req.params;
        const data = await fetchEvents(`/signups/event/${eventId}/${signupId}`, req.cookies.accessToken, {
            method: 'PUT',
            body: JSON.stringify(req.body),
        });

        if (data.success) {
            res.redirect(`/events/${eventId}/signups?success=1&msg=` + encodeURIComponent('Signup updated'));
        } else {
            res.redirect(`/events/${eventId}/signups?error=` + encodeURIComponent(data.error));
        }
    } catch (err) {
        logger.error('Error updating signup:', err);
        res.redirect(`/events/${req.params.eventId}/signups?error=` + encodeURIComponent('Failed to update signup'));
    }
};

// ==========================================
// Student Controllers
// ==========================================

// Events page with filters (upcoming, signed-up, past)
exports.studentEvents = async (req, res) => {
    const filter = req.query.filter || 'upcoming';

    try {
        // Fetch all upcoming public events
        const eventsData = await fetchEvents('/events/public', req.cookies.accessToken);
        // Fetch student's signups
        const signupsData = await fetchEvents('/signups/my', req.cookies.accessToken);

        const now = new Date();
        const signups = signupsData.signups || [];
        // Only consider active signups (not cancelled) when filtering upcoming events
        const activeSignupEventIds = new Set(
            signups.filter(s => s.status !== 'cancelled').map(s => s.eventId)
        );

        let events = [];
        let pageTitle = 'Events';

        // Helper to check if event has upcoming shifts
        const hasUpcomingShifts = (event) => {
            if (!event || !event.shifts || event.shifts.length === 0) return false;
            const today = now.toISOString().split('T')[0];
            return event.shifts.some(s => s.date >= today);
        };

        // Helper to get earliest shift date
        const getEarliestShiftDate = (event) => {
            if (!event || !event.shifts || event.shifts.length === 0) return null;
            return event.shifts.reduce((earliest, s) => {
                return !earliest || s.date < earliest ? s.date : earliest;
            }, null);
        };

        if (filter === 'upcoming') {
            // All upcoming published events (excluding ones with active signups)
            events = (eventsData.events || []).filter(e => !activeSignupEventIds.has(e.id));
            pageTitle = 'Upcoming Events';
        } else if (filter === 'signed-up') {
            // Future events the student signed up for
            events = signups
                .filter(s => s.event && hasUpcomingShifts(s.event) && s.status !== 'cancelled')
                .map(s => ({ ...s.event, signupStatus: s.status, signupId: s.id }));
            pageTitle = 'My Upcoming Events';
        } else if (filter === 'past') {
            // Past events the student signed up for
            events = signups
                .filter(s => s.event && !hasUpcomingShifts(s.event))
                .map(s => ({ ...s.event, signupStatus: s.status, signupId: s.id }));
            pageTitle = 'Past Events';
        }

        res.render('pages/events/student-events', {
            title: pageTitle,
            user: req.user,
            events,
            filter,
            error: null,
        });
    } catch (err) {
        logger.error('Error fetching student events:', err);
        res.render('pages/events/student-events', {
            title: 'Events',
            user: req.user,
            events: [],
            filter,
            error: 'Failed to load events',
        });
    }
};

// View single event
exports.studentViewEvent = async (req, res) => {
    try {
        const data = await fetchEvents(`/events/public/${req.params.eventId}`, req.cookies.accessToken);

        if (!data.success) {
            return res.status(404).render('pages/error', {
                error: '404',
                title: 'Not Found',
                msg: 'Event not found',
            });
        }

        // Check if student already signed up
        const signupsData = await fetchEvents('/signups/my', req.cookies.accessToken);
        const existingSignup = signupsData.signups?.find(s => s.eventId === req.params.eventId);

        res.render('pages/events/student-event', {
            title: data.event.title,
            user: req.user,
            event: data.event,
            signup: existingSignup,
        });
    } catch (err) {
        logger.error('Error fetching event:', err);
        res.status(500).render('pages/error', {
            error: '500',
            title: 'Error',
            msg: 'Failed to load event',
        });
    }
};

// Sign up for event
exports.studentSignup = async (req, res) => {
    try {
        const data = await fetchEvents(`/signups/event/${req.params.eventId}`, req.cookies.accessToken, {
            method: 'POST',
            body: JSON.stringify(req.body),
        });

        if (data.success) {
            res.redirect(`/event/${req.params.eventId}?success=1&msg=` + encodeURIComponent('Signed up successfully!'));
        } else {
            res.redirect(`/event/${req.params.eventId}?error=` + encodeURIComponent(data.error));
        }
    } catch (err) {
        logger.error('Error signing up:', err);
        res.redirect(`/event/${req.params.eventId}?error=` + encodeURIComponent('Failed to sign up'));
    }
};

// Cancel signup
exports.studentCancelSignup = async (req, res) => {
    try {
        const data = await fetchEvents(`/signups/event/${req.params.eventId}`, req.cookies.accessToken, {
            method: 'DELETE',
        });

        if (data.success) {
            res.redirect('/events?filter=signed-up&success=1&msg=' + encodeURIComponent('Signup cancelled'));
        } else {
            res.redirect('/events?filter=signed-up&error=' + encodeURIComponent(data.error));
        }
    } catch (err) {
        logger.error('Error cancelling signup:', err);
        res.redirect('/events?filter=signed-up&error=' + encodeURIComponent('Failed to cancel signup'));
    }
};

// View my signups
exports.studentMySignups = async (req, res) => {
    try {
        const data = await fetchEvents('/signups/my', req.cookies.accessToken);
        res.render('pages/events/student-signups', {
            title: 'My Signups',
            user: req.user,
            signups: data.signups || [],
            error: data.success ? null : data.error,
        });
    } catch (err) {
        logger.error('Error fetching signups:', err);
        res.render('pages/events/student-signups', {
            title: 'My Signups',
            user: req.user,
            signups: [],
            error: 'Failed to load signups',
        });
    }
};

// ==========================================
// Event Detail Pages (Organization)
// ==========================================

// Event Overview
exports.orgEventOverview = async (req, res) => {
    try {
        const eventId = req.params.eventId;

        // Fetch event details
        const eventsData = await fetchEvents('/events/my', req.cookies.accessToken);
        const event = eventsData.events?.find(e => e.id === eventId);

        if (!event) {
            return res.status(404).render('pages/error', {
                error: '404',
                title: 'Not Found',
                msg: 'Event not found',
            });
        }

        // Fetch shifts and signups for stats
        const shiftsData = await fetchEvents(`/events/${eventId}/shifts`, req.cookies.accessToken);
        const signupsData = await fetchEvents(`/signups/event/${eventId}`, req.cookies.accessToken);

        const signups = signupsData.signups || [];
        const shifts = shiftsData.shifts || [];

        const stats = {
            totalSignups: signups.length,
            confirmedSignups: signups.filter(s => s.status === 'confirmed').length,
            pendingSignups: signups.filter(s => s.status === 'pending').length,
            totalShifts: shifts.length,
        };

        res.render('pages/events/org-event-overview', {
            title: event.title,
            user: req.user,
            currentEvent: event,
            activeSubNav: 'overview',
            event,
            shifts,
            stats,
            success: req.query.success === '1',
            error: req.query.error || null,
            msg: req.query.msg || null,
        });
    } catch (err) {
        logger.error('Error fetching event overview:', err);
        res.status(500).render('pages/error', {
            error: '500',
            title: 'Error',
            msg: 'Failed to load event',
        });
    }
};

// ==========================================
// Shift Management (Organization)
// ==========================================

// View and manage shifts for an event
exports.orgManageShifts = async (req, res) => {
    try {
        const data = await fetchEvents(`/events/${req.params.eventId}/shifts`, req.cookies.accessToken);

        if (!data.success) {
            return res.status(404).render('pages/error', {
                error: '404',
                title: 'Not Found',
                msg: data.error || 'Event not found',
            });
        }

        res.render('pages/events/org-manage-shifts', {
            title: `Shifts - ${data.event?.title}`,
            user: req.user,
            currentEvent: data.event,
            activeSubNav: 'shifts',
            event: data.event,
            shifts: data.shifts || [],
            confirmedSignups: data.confirmedSignups || [],
            unassignedSignups: data.unassignedSignups || [],
            success: req.query.success === '1',
            error: req.query.error || null,
            msg: req.query.msg || null,
        });
    } catch (err) {
        logger.error('Error fetching shifts:', err);
        res.status(500).render('pages/error', {
            error: '500',
            title: 'Error',
            msg: 'Failed to load shifts',
        });
    }
};

// Attendance page (focused view of shift attendance)
exports.orgAttendance = async (req, res) => {
    try {
        const data = await fetchEvents(`/events/${req.params.eventId}/shifts`, req.cookies.accessToken);

        if (!data.success) {
            return res.status(404).render('pages/error', {
                error: '404',
                title: 'Not Found',
                msg: data.error || 'Event not found',
            });
        }

        // In production, check if attendance page should be accessible (day before first shift or later)
        const { isProduction } = require('../config/environment');
        if (isProduction) {
            const shifts = data.shifts || [];
            if (shifts.length > 0) {
                const sortedShifts = [...shifts].sort((a, b) => a.date.localeCompare(b.date));
                const firstShiftDate = new Date(sortedShifts[0].date);
                const dayBeforeEvent = new Date(firstShiftDate);
                dayBeforeEvent.setDate(dayBeforeEvent.getDate() - 1);
                dayBeforeEvent.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (today < dayBeforeEvent) {
                    return res.redirect(`/events/${req.params.eventId}?error=` + encodeURIComponent('Attendance tracking is available from the day before the event'));
                }
            }
        }

        res.render('pages/events/org-attendance', {
            title: `Attendance - ${data.event?.title}`,
            user: req.user,
            currentEvent: data.event,
            activeSubNav: 'attendance',
            event: data.event,
            shifts: data.shifts || [],
            success: req.query.success === '1',
            error: req.query.error || null,
            msg: req.query.msg || null,
        });
    } catch (err) {
        logger.error('Error fetching attendance:', err);
        res.status(500).render('pages/error', {
            error: '500',
            title: 'Error',
            msg: 'Failed to load attendance',
        });
    }
};

// Assign students to a shift
exports.orgAssignShift = async (req, res) => {
    try {
        const { eventId, shiftId } = req.params;
        const data = await fetchEvents(`/events/${eventId}/shifts/${shiftId}/assignments`, req.cookies.accessToken, {
            method: 'POST',
            body: JSON.stringify(req.body),
        });

        // Return JSON for AJAX requests
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json(data);
        }

        if (data.success) {
            res.redirect(`/events/${eventId}/shifts?success=1&msg=` + encodeURIComponent('Students assigned'));
        } else {
            res.redirect(`/events/${eventId}/shifts?error=` + encodeURIComponent(data.error));
        }
    } catch (err) {
        logger.error('Error assigning shift:', err);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, error: 'Failed to assign students' });
        }
        res.redirect(`/events/${req.params.eventId}/shifts?error=` + encodeURIComponent('Failed to assign students'));
    }
};

// Update assignment attendance
exports.orgUpdateAttendance = async (req, res) => {
    try {
        const { eventId, shiftId } = req.params;
        const data = await fetchEvents(`/events/${eventId}/shifts/${shiftId}/assignments/bulk-status`, req.cookies.accessToken, {
            method: 'POST',
            body: JSON.stringify(req.body),
        });

        // Return JSON for AJAX requests
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json(data);
        }

        if (data.success) {
            res.redirect(`/events/${eventId}/shifts?success=1&msg=` + encodeURIComponent('Attendance updated'));
        } else {
            res.redirect(`/events/${eventId}/shifts?error=` + encodeURIComponent(data.error));
        }
    } catch (err) {
        logger.error('Error updating attendance:', err);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, error: 'Failed to update attendance' });
        }
        res.redirect(`/events/${req.params.eventId}/shifts?error=` + encodeURIComponent('Failed to update attendance'));
    }
};

// Remove assignment from shift
exports.orgRemoveAssignment = async (req, res) => {
    try {
        const { eventId, shiftId, assignmentId } = req.params;
        const data = await fetchEvents(`/events/${eventId}/shifts/${shiftId}/assignments/${assignmentId}`, req.cookies.accessToken, {
            method: 'DELETE',
        });

        // Return JSON for AJAX requests
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json(data);
        }

        if (data.success) {
            res.redirect(`/events/${eventId}/shifts?success=1&msg=` + encodeURIComponent('Assignment removed'));
        } else {
            res.redirect(`/events/${eventId}/shifts?error=` + encodeURIComponent(data.error));
        }
    } catch (err) {
        logger.error('Error removing assignment:', err);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, error: 'Failed to remove assignment' });
        }
        res.redirect(`/events/${req.params.eventId}/shifts?error=` + encodeURIComponent('Failed to remove assignment'));
    }
};

// Generate invoices for attended shifts
exports.orgGenerateInvoices = async (req, res) => {
    try {
        const { eventId } = req.params;
        const data = await fetchEvents(`/events/${eventId}/shifts/generate-invoices`, req.cookies.accessToken, {
            method: 'POST',
        });

        if (data.success) {
            res.redirect(`/events/${eventId}/shifts?success=1&msg=` + encodeURIComponent(`Generated ${data.count} invoice(s)`));
        } else {
            res.redirect(`/events/${eventId}/shifts?error=` + encodeURIComponent(data.error));
        }
    } catch (err) {
        logger.error('Error generating invoices:', err);
        res.redirect(`/events/${req.params.eventId}/shifts?error=` + encodeURIComponent('Failed to generate invoices'));
    }
};

// Download attendance list as PDF
exports.orgDownloadAttendanceList = async (req, res) => {
    try {
        const data = await fetchEvents(`/events/${req.params.eventId}/shifts`, req.cookies.accessToken);

        if (!data.success) {
            return res.status(404).send('Event not found');
        }

        const event = data.event;
        const shifts = data.shifts || [];

        // Sort shifts by date and time
        const sortedShifts = [...shifts].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.startTime.localeCompare(b.startTime);
        });

        // Create PDF document (landscape orientation)
        const doc = new PDFDocument({ layout: 'landscape', margin: 50 });

        // Set response headers
        const filename = `attendance-list-${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Pipe PDF to response
        doc.pipe(res);

        // Title
        doc.fontSize(20).font('Helvetica-Bold').text('Attendance List', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(16).font('Helvetica').text(event.title, { align: 'center' });
        doc.moveDown(1.5);

        // Generate table for each shift
        sortedShifts.forEach((shift, shiftIndex) => {
            const assignments = shift.assignments || [];

            // Check if we need a new page (leave space for header + at least 3 rows)
            if (doc.y > 450) {
                doc.addPage();
            }

            // Shift header
            const shiftDate = new Date(shift.date);
            const dateStr = shiftDate.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            doc.fontSize(12).font('Helvetica-Bold').text(`${dateStr}`, { continued: false });
            doc.fontSize(10).font('Helvetica').text(`${shift.startTime.substring(0, 5)} - ${shift.endTime.substring(0, 5)}`);
            doc.moveDown(0.5);

            if (assignments.length === 0) {
                doc.fontSize(10).font('Helvetica-Oblique').text('No students assigned to this shift');
                doc.moveDown(1.5);
            } else {
                // Table configuration (wider columns for landscape)
                const tableTop = doc.y;
                const colWidths = {
                    num: 40,
                    name: 250,
                    email: 250,
                    signature: 150
                };
                const rowHeight = 28;
                const tableWidth = colWidths.num + colWidths.name + colWidths.email + colWidths.signature;
                const startX = 50;

                // Draw table header
                doc.fontSize(10).font('Helvetica-Bold');
                let x = startX;

                // Header background
                doc.rect(startX, tableTop, tableWidth, rowHeight).fill('#f0f0f0');
                doc.fillColor('#000');

                // Header text
                doc.text('#', x + 8, tableTop + 9, { width: colWidths.num - 16 });
                x += colWidths.num;
                doc.text('Student Name', x + 8, tableTop + 9, { width: colWidths.name - 16 });
                x += colWidths.name;
                doc.text('Email', x + 8, tableTop + 9, { width: colWidths.email - 16 });
                x += colWidths.email;
                doc.text('Signature', x + 8, tableTop + 9, { width: colWidths.signature - 16 });

                // Draw header border
                doc.rect(startX, tableTop, tableWidth, rowHeight).stroke();

                // Draw rows
                let currentY = tableTop + rowHeight;
                doc.font('Helvetica').fontSize(10);

                assignments.forEach((assignment, idx) => {
                    // Check if we need a new page
                    if (currentY > 520) {
                        doc.addPage();
                        currentY = 50;
                    }

                    x = startX;
                    // Use email as fallback for name (same logic as attendance page)
                    const studentName = assignment.signup?.studentName || assignment.signup?.studentEmail || 'N/A';
                    const studentEmail = assignment.signup?.studentEmail || 'N/A';

                    // Draw row
                    doc.text((idx + 1).toString(), x + 8, currentY + 9, { width: colWidths.num - 16 });
                    x += colWidths.num;
                    doc.text(studentName, x + 8, currentY + 9, { width: colWidths.name - 16 });
                    x += colWidths.name;
                    doc.text(studentEmail, x + 8, currentY + 9, { width: colWidths.email - 16 });
                    x += colWidths.email;
                    // Signature field is left empty for students to sign

                    // Draw row border
                    doc.rect(startX, currentY, tableWidth, rowHeight).stroke();

                    // Draw vertical lines for columns
                    let lineX = startX + colWidths.num;
                    doc.moveTo(lineX, currentY).lineTo(lineX, currentY + rowHeight).stroke();
                    lineX += colWidths.name;
                    doc.moveTo(lineX, currentY).lineTo(lineX, currentY + rowHeight).stroke();
                    lineX += colWidths.email;
                    doc.moveTo(lineX, currentY).lineTo(lineX, currentY + rowHeight).stroke();

                    currentY += rowHeight;
                });

                // Reset cursor position after table (x back to left margin)
                doc.x = 50;
                doc.y = currentY + 20;
            }

            // Add spacing between shifts
            if (shiftIndex < sortedShifts.length - 1) {
                doc.moveDown(1);
            }
        });

        // Footer
        doc.moveDown(2);
        doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666');
        doc.text(`Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, { align: 'center' });

        // Finalize PDF
        doc.end();

    } catch (err) {
        logger.error('Error generating attendance PDF:', err);
        res.status(500).send('Failed to generate attendance list');
    }
};

// ==========================================
// Shared - Home redirects based on role
// ==========================================

exports.home = (req, res) => {
    if (req.user.role === 'organization' || req.user.role === 'student') {
        return res.redirect('/events');
    }
    res.render('pages/home', {
        title: 'Dashboard',
        user: req.user,
    });
};
