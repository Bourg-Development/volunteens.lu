const { User, Session, ACCOUNT_STATUSES, ROLES, ROLE_PERMISSIONS } = require('../../../database');
const logger = require('../../../utils/logger');
const { verifyAccessToken } = require('../auth/authUtils');

/**
 * Verify a token and return user info
 * Used by other microservices to authenticate requests
 *
 * Expects either:
 * - Authorization header: Bearer <accessToken>
 * - Body: { accessToken: "..." }
 */
exports.verify = async (req, res) => {
    try {
        let token = null;

        // Check Authorization header first
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }

        // Fall back to body
        if (!token && req.body.accessToken) {
            token = req.body.accessToken;
        }

        if (!token) {
            return res.status(401).json({
                valid: false,
                error: 'No token provided',
            });
        }

        let payload;
        try {
            payload = verifyAccessToken(token);
        } catch (err) {
            return res.status(401).json({
                valid: false,
                error: 'Invalid token',
                reason: err.name === 'TokenExpiredError' ? 'expired' : 'invalid',
            });
        }

        // Check if session is still valid
        const session = await Session.findOne({
            where: { id: payload.sessionId, revoked: false },
        });

        if (!session) {
            return res.status(401).json({
                valid: false,
                error: 'Session revoked',
            });
        }

        // Get user info including role and permissions
        const user = await User.findByPk(payload.id, {
            attributes: ['id', 'email', 'firstName', 'lastName', 'accountStatus', 'organizationName', 'organizationType', 'role', 'permissions', 'profileComplete'],
        });

        if (!user) {
            return res.status(401).json({
                valid: false,
                error: 'User not found',
            });
        }

        if(user.accountStatus !== ACCOUNT_STATUSES.ACTIVE){
            return res.status(401).json({
                valid: false,
                error: 'Account not active',
            });
        }

        // Calculate effective permissions (role permissions + custom permissions)
        const rolePerms = ROLE_PERMISSIONS[user.role] || [];
        const customPerms = user.permissions || [];
        const effectivePermissions = [...new Set([...rolePerms, ...customPerms])];

        const userResponse = {
            id: user.id,
            email: user.email,
            role: user.role,
            organizationType: user.organizationType,
            permissions: effectivePermissions,
        };

        if (user.role === ROLES.STUDENT) {
            userResponse.firstName = user.firstName;
            userResponse.lastName = user.lastName;
            userResponse.profileComplete = user.profileComplete;
            // Computed full name for convenience
            if (user.firstName || user.lastName) {
                userResponse.name = [user.firstName, user.lastName].filter(Boolean).join(' ');
            }
        } else if (user.role === ROLES.ORGANIZATION) {
            userResponse.organizationName = user.organizationName;
            userResponse.name = user.organizationName;
            userResponse.profileComplete = true; // Organizations don't need profile completion
        }

        res.json({
            valid: true,
            user: userResponse,
            sessionId: session.id,
        });
    } catch (err) {
        logger.error('Token verification error:', err);
        res.status(500).json({
            valid: false,
            error: 'Verification failed',
        });
    }
};

/**
 * Get user profile by ID (for internal service use)
 * Used by payment service to get student's billing details for invoices
 */
exports.getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByPk(userId, {
            attributes: [
                'id', 'email', 'role',
                'firstName', 'lastName', 'dateOfBirth', 'phone',
                'street', 'city', 'postalCode', 'country',
                'iban', 'bic', 'bankName', 'accountHolderName',
                'profileComplete',
            ],
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        // Build full name
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;

        // Build full address
        const addressParts = [user.street, user.postalCode, user.city, user.country].filter(Boolean);
        const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null;

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name,
                firstName: user.firstName,
                lastName: user.lastName,
                dateOfBirth: user.dateOfBirth,
                phone: user.phone,
                // Address
                street: user.street,
                city: user.city,
                postalCode: user.postalCode,
                country: user.country,
                fullAddress,
                // Bank details
                iban: user.iban,
                bic: user.bic,
                bankName: user.bankName,
                accountHolderName: user.accountHolderName || name,
                // Status
                profileComplete: user.profileComplete,
            },
        });
    } catch (err) {
        logger.error('Get user profile error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to get user profile',
        });
    }
};
