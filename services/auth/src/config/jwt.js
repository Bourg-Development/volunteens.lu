module.exports = {
    accessToken: {
        secret: process.env.JWT_ACCESS_SECRET || 'access-secret-change-in-production',
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    },
    refreshToken: {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production',
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        expiresInMs: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    },
};
