const servicesConfig = require('../config/services');
const logger = require('../utils/logger');

const AUTH_URL = servicesConfig.authInternal;

/**
 * Get user profile by ID from auth service
 * Used to fetch student's full profile (address, bank details) for invoices
 */
async function getUserProfile(userId) {
    try {
        const response = await fetch(`${AUTH_URL}/api/v1/internal/users/${userId}/profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const result = await response.json();

        if (!result.success) {
            logger.error('Auth service error:', result.error);
            return null;
        }

        return result.user;
    } catch (err) {
        logger.error('Failed to fetch user profile:', err.message);
        return null;
    }
}

module.exports = {
    getUserProfile,
};
