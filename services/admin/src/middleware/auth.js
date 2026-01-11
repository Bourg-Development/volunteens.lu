const logger = require('../utils/logger');
const servicesConfig = require('../config/services')

// Role hierarchy (higher index = more privileges)
const ROLE_HIERARCHY = ['student', 'organization', 'moderator', 'admin', 'super_admin'];

/**
 * Verify token with auth service and attach user to request
 */
async function verifyToken(req) {
    const accessToken = extractToken(req);

    if (!accessToken) {
        return { valid: false, error: 'No access token provided', status: 401 };
    }

    let response;
    try {
        response = await fetch('http://auth:3000/api/v1/internal/verify', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: accessToken })
        });
    } catch (err) {
        logger.error('Error verifying access token with auth service: fetch failed', err);
        return { valid: false, error: 'Authentication service unavailable', status: 503 };
    }

    const data = await response.json();

    if (!data.valid) {
        return { valid: false, error: data.error || 'Invalid or expired token', status: 401 };
    }

    return { valid: true, user: data.user };
}

/**
 * Middleware to require authentication via the auth service
 */
const requireAuth = async (req, res, next) => {
    const result = await verifyToken(req);

    if (!result.valid) {
        return res.redirect(`${servicesConfig.auth}/login`)
    }

    req.user = result.user;
    return next();
};

/**
 * Middleware to require a specific role or higher
 * @param {string} minRole - Minimum role required ('user', 'moderator', 'admin', 'super_admin')
 */
const requireRole = (minRole) => {
    return async (req, res, next) => {
        const result = await verifyToken(req);

        if (!result.valid) {
            return res.redirect(`${servicesConfig.auth}/login`)
        }

        req.user = result.user;

        const userRoleIndex = ROLE_HIERARCHY.indexOf(req.user.role);
        const requiredRoleIndex = ROLE_HIERARCHY.indexOf(minRole);

        if (userRoleIndex < requiredRoleIndex) {
            logger.warn(`Unauthorized access attempt by ${req.user.email} (role: ${req.user.role}, required: ${minRole})`);
            return res.status(403).json({
                success: false,
                error: `Requires ${minRole} role or higher`,
            });
        }

        return next();
    };
};

/**
 * Middleware to require a specific permission
 * @param {string} permission - Required permission (e.g., 'users:approve')
 */
const requirePermission = (permission) => {
    return async (req, res, next) => {
        const result = await verifyToken(req);

        if (!result.valid) {
            return res.redirect(`${servicesConfig.auth}/login`)
        }

        req.user = result.user;

        // Super admin has all permissions
        if (req.user.role === 'super_admin') {
            return next();
        }

        // Check if user has the required permission
        const userPermissions = req.user.permissions || [];
        if (!userPermissions.includes(permission)) {
            logger.warn(`Missing permission '${permission}' for user ${req.user.email}`);
            return res.status(403).json({
                success: false,
                error: `Missing permission: ${permission}`,
            });
        }

        return next();
    };
};

/**
 * Middleware to require admin role (admin or super_admin)
 */
const requireAdmin = requireRole('admin');

function extractToken(req) {
    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    // Fall back to cookie
    return req.cookies?.accessToken;
}

module.exports = {
    requireAuth,
    requireRole,
    requirePermission,
    requireAdmin,
    ROLE_HIERARCHY,
};
