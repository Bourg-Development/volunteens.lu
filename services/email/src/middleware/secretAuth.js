const logger = require('../utils/logger');

const EMAIL_SERVICE_SECRET = process.env.EMAIL_SERVICE_SECRET;

module.exports = {
    verifySecret: (req, res, next) => {
        const secret = req.headers['x-email-secret'] || req.headers['authorization']?.replace('Bearer ', '');

        if (!EMAIL_SERVICE_SECRET) {
            logger.warn('EMAIL_SERVICE_SECRET not configured, allowing all requests');
            return next();
        }

        if (!secret) {
            return res.status(401).json({ success: false, error: 'Missing authentication' });
        }

        if (secret !== EMAIL_SERVICE_SECRET) {
            logger.warn('Invalid email service secret attempt');
            return res.status(403).json({ success: false, error: 'Invalid authentication' });
        }

        next();
    },
};