const logger = require('../utils/logger');
const servicesConfig = require('../config/services');

const PAYMENT_SERVICE_SECRET = servicesConfig.paymentServiceSecret;

module.exports = {
    verifySecret: (req, res, next) => {
        const secret = req.headers['x-payment-secret'] || req.headers['authorization']?.replace('Bearer ', '');

        if (!PAYMENT_SERVICE_SECRET) {
            logger.warn('PAYMENT_SERVICE_SECRET not configured, allowing all requests');
            return next();
        }

        if (!secret) {
            return res.status(401).json({ success: false, error: 'Missing authentication' });
        }

        if (secret !== PAYMENT_SERVICE_SECRET) {
            logger.warn('Invalid payment service secret attempt');
            return res.status(403).json({ success: false, error: 'Invalid authentication' });
        }

        next();
    },
};
