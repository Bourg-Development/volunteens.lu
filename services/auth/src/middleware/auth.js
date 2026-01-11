const { User, Session, ACCOUNT_STATUSES } = require('../database');
const { verifyAccessToken } = require('../api/v1/auth/authUtils');

const requireAuth = async (req, res, next) => {
    try {
        // Get token from cookie or Authorization header
        let token = req.cookies?.accessToken;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }

        if (!token) {
            return res.status(401).json({ success: false, error: 'No access token provided' });
        }

        let payload;
        try {
            payload = verifyAccessToken(token);
        } catch (err) {
            return res.status(401).json({ success: false, error: 'Invalid or expired token' });
        }

        // Check if session is still valid
        const session = await Session.findOne({
            where: { id: payload.sessionId, revoked: false },
        });

        if (!session) {
            return res.status(401).json({ success: false, error: 'Session revoked' });
        }

        // Get user
        const user = await User.findByPk(payload.id);

        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }

        if (user.accountStatus !== ACCOUNT_STATUSES.ACTIVE) {
            return res.status(401).json({ success: false, error: 'Account not active' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Authentication failed' });
    }
};

module.exports = { requireAuth };
