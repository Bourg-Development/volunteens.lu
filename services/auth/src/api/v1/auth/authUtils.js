const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../../config/jwt');

function generateAccessToken(user, sessionId) {
    return jwt.sign(
        { id: user.id, email: user.email, sessionId },
        jwtConfig.accessToken.secret,
        { expiresIn: jwtConfig.accessToken.expiresIn }
    );
}

function generateRefreshToken(user, sessionId) {
    return jwt.sign(
        { id: user.id, sessionId },
        jwtConfig.refreshToken.secret,
        { expiresIn: jwtConfig.refreshToken.expiresIn }
    );
}

function generateFingerprint() {
    return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function getClientInfo(req) {
    return {
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || req.connection?.remoteAddress || null,
    };
}

function verifyAccessToken(token) {
    return jwt.verify(token, jwtConfig.accessToken.secret);
}

function verifyRefreshToken(token) {
    return jwt.verify(token, jwtConfig.refreshToken.secret);
}

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined, // e.g., '.volunteens.lu' for shared cookies
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateFingerprint,
    hashToken,
    getClientInfo,
    verifyAccessToken,
    verifyRefreshToken,
    cookieOptions,
};
