const { Op } = require('sequelize');
const { User, Session } = require('../../../database');
const logger = require('../../../utils/logger');
const { verifyAccessToken } = require('../auth/authUtils');

exports.list = async (req, res) => {
    try {
        const { accessToken } = req.cookies;

        if (!accessToken) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        let payload;
        try {
            payload = verifyAccessToken(accessToken);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const sessions = await Session.findAll({
            where: { userId: payload.id, revoked: false },
            attributes: ['id', 'userAgent', 'ipAddress', 'deviceName', 'lastUsedAt', 'createdAt'],
            order: [['lastUsedAt', 'DESC']],
        });

        const currentSessionId = payload.sessionId;

        res.json({
            sessions: sessions.map(s => ({
                id: s.id,
                userAgent: s.userAgent,
                ipAddress: s.ipAddress,
                deviceName: s.deviceName,
                lastUsedAt: s.lastUsedAt,
                createdAt: s.createdAt,
                current: s.id === currentSessionId,
            })),
        });
    } catch (err) {
        logger.error('Sessions list error:', err);
        res.status(500).json({ error: 'Failed to list sessions' });
    }
};

exports.revoke = async (req, res) => {
    try {
        const { accessToken } = req.cookies;
        const { sessionId } = req.params;

        if (!accessToken) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        let payload;
        try {
            payload = verifyAccessToken(accessToken);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const session = await Session.findOne({
            where: { id: sessionId, userId: payload.id, revoked: false },
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        await session.update({ revoked: true });

        res.json({ message: 'Session revoked' });
    } catch (err) {
        logger.error('Revoke session error:', err);
        res.status(500).json({ error: 'Failed to revoke session' });
    }
};

exports.revokeAll = async (req, res) => {
    try {
        const { accessToken } = req.cookies;

        if (!accessToken) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        let payload;
        try {
            payload = verifyAccessToken(accessToken);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        await Session.update(
            { revoked: true },
            {
                where: {
                    userId: payload.id,
                    id: { [Op.ne]: payload.sessionId },
                    revoked: false,
                }
            }
        );

        res.json({ message: 'All other sessions revoked' });
    } catch (err) {
        logger.error('Revoke all sessions error:', err);
        res.status(500).json({ error: 'Failed to revoke sessions' });
    }
};
