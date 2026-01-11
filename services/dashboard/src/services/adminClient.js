const servicesConfig = require('../config/services');
const logger = require('../utils/logger');

const ADMIN_URL = servicesConfig.adminInternal;
const ADMIN_SECRET = servicesConfig.adminServiceSecret;

async function getSetting(key) {
    try {
        const response = await fetch(`${ADMIN_URL}/api/v1/internal/settings/${key}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-secret': ADMIN_SECRET,
            },
        });

        const result = await response.json();
        if (!result.success) {
            logger.error('Admin service error:' + result.error);
            return null;
        }
        return result.value;
    } catch (err) {
        logger.error('Failed to get setting:' + err.message);
        return null;
    }
}

async function getHourlyRateRecommendation() {
    const rate = await getSetting('hourly_rate_recommendation');
    if (rate === null) {
        logger.warn('Could not fetch hourly rate recommendation, using default 15.00');
        return 15.00;
    }
    return parseFloat(rate);
}

module.exports = {
    getSetting,
    getHourlyRateRecommendation,
};
