const logger = require('../utils/logger');

const ADMIN_SERVICE_SECRET = process.env.ADMIN_SERVICE_SECRET;

module.exports = {
    verifySecret: (req, res, next) => {
        const secret = req.headers['x-admin-secret'] || req.headers['authorization']?.replace('Bearer ', '');

        if (!ADMIN_SERVICE_SECRET) {
            logger.warn('ADMIN_SERVICE_SECRET not configured, allowing all requests');
            return next();
        }

        if (!secret) {
            return res.status(401).json({ success: false, error: 'Missing authentication' });
        }

        if (secret !== ADMIN_SERVICE_SECRET) {
            logger.warn('Invalid admin service secret attempt');
            return res.status(403).json({ success: false, error: 'Invalid authentication' });
        }

        next();
    },
};
