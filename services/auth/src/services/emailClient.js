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
            logger.error('Email service error: \n' +  result.error);
            return false;
        }

        logger.info(`Email sent: ${type} to ${to}`);
        return true;
    } catch (err) {
        logger.error('Failed to send email: \n' +  err.message);
        return false;
    }
}


async function sendEmailVerificationCode({ to, studentName, otp }) {
    return sendEmail('emailVerification', to, {
        studentName,
        otpLink: `${services.auth}/api/v1/auth/verify/${otp}`
    });
}

async function sendWelcomeStudent({ to, studentName, dashboardUrl }){
    return sendEmail('welcomeStundent', to, {
        studentName,
        dashboardUrl,
    });
}

async function sendOrgSignupPending({ to, organizationName }){
    return sendEmail('orgSignupPending', to, {
        organizationName,
    });
}

async function sendPasswordReset({ to, userName, resetToken }){
    return sendEmail('passwordReset', to, {
        userName,
        resetLink: `${services.auth}/reset-password?token=${resetToken}`,
        expiresIn: 15,
    });
}

module.exports = {
    sendEmailVerificationCode,
    sendWelcomeStudent,
    sendOrgSignupPending,
    sendPasswordReset,
};
