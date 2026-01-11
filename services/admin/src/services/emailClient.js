const services = require('../config/services');
const logger = require('../utils/logger');

const EMAIL_URL = services.email;
const EMAIL_SECRET = services.emailServiceSecret;

async function sendEmail(type, to, data) {
    logger.info(`Attempting to send email: type=${type}, to=${to}, url=${EMAIL_URL}, secret=${EMAIL_SECRET ? 'SET' : 'NOT SET'}`);
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
        logger.info(`Email service response: ${JSON.stringify(result)}`);

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

async function sendWelcomeOrg({ to, organizationName, dashboardUrl, supportEmail }) {
    return sendEmail('welcomeOrg', to, {
        organizationName,
        dashboardUrl,
        supportEmail,
    });
}

module.exports = {
    sendWelcomeOrg,
};
