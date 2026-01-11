const services = require('../config/services');
const logger = require('../utils/logger');

const EMAIL_URL = services.email;
const EMAIL_SECRET = services.emailServiceSecret;

async function sendEmail(type, to, data) {
    logger.info(`Attempting to send email: type=${type}, to=${to}, url=${EMAIL_URL}`);
    try {
        const response = await fetch(`${EMAIL_URL}/api/v1/internal/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-email-secret': EMAIL_SECRET,
            },
            body: JSON.stringify({ type, to, data }),
        });

        const result = await response.json();

        if (!result.success) {
            logger.error('Email service error:', result.error);
            return false;
        }

        logger.info(`Email sent: ${type} to ${to}`);
        return true;
    } catch (err) {
        logger.error('Failed to send email:', err.message);
        return false;
    }
}

async function sendSignupConfirmation({ to, studentName, eventTitle, eventDate, eventLocation }) {
    return sendEmail('signupConfirmation', to, {
        studentName,
        eventTitle,
        eventDate,
        eventLocation,
    });
}

async function sendSignupNotificationToOrg({ to, studentName, studentEmail, eventTitle, eventId, message }) {
    return sendEmail('signupNotification', to, {
        studentName,
        studentEmail,
        eventTitle,
        eventId,
        message,
    });
}

async function sendSignupStatusUpdate({ to, studentName, eventTitle, status, notes }) {
    return sendEmail('signupStatusUpdate', to, {
        studentName,
        eventTitle,
        status,
        notes,
    });
}

async function sendSignupCancellation({ to, studentName, eventTitle }) {
    return sendEmail('signupCancellation', to, {
        studentName,
        eventTitle,
    });
}

async function sendShiftAssignment({ to, studentName, eventTitle, eventLocation, shiftDate, shiftStartTime, shiftEndTime, dashboardUrl }) {
    return sendEmail('shiftAssignment', to, {
        studentName,
        eventTitle,
        eventLocation,
        shiftDate,
        shiftStartTime,
        shiftEndTime,
        dashboardUrl,
    });
}

module.exports = {
    sendSignupConfirmation,
    sendSignupNotificationToOrg,
    sendSignupStatusUpdate,
    sendSignupCancellation,
    sendShiftAssignment,
};
