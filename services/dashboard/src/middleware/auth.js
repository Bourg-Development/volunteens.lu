const servicesConfig = require('../config/services');
const logger = require('../utils/logger');

const requireAuth = async (req, res, next) => {
    const accessToken = extractToken(req);
    let response;
    try {
        response = await fetch('http://auth:3000/api/v1/internal/verify', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: accessToken })
        });
    } catch (err) {
        logger.error('Error verifying access token with auth service: fetch failed', err);
        return res.status(503).render('pages/error', {
            error: '503',
            title: 'Service Unavailable',
            heading: 'Service Temporarily Unavailable',
            msg: 'We are unable to verify your session at this time. Please try again later.',
            showRetry: true
        });
    }
    const data = await response.json();
    if (data.valid === true) {
        req.user = data.user;
        return next();
    }
    res.status(401).redirect(`${servicesConfig.auth}/login?success=0&msg=${encodeURIComponent('Please login to access this ressource')}&redirect=${encodeURIComponent(`${req.protocol}://${req.headers.host}${req.originalUrl}`)}`);
};

const requireOrganization = (req, res, next) => {
    if (req.user?.role !== 'organization') {
        return res.status(403).render('pages/error', {
            error: '403',
            title: 'Forbidden',
            heading: 'Access Denied',
            msg: 'This page is only available for organization accounts.',
        });
    }
    next();
};

const requireStudent = (req, res, next) => {
    if (req.user?.role !== 'student') {
        return res.status(403).render('pages/error', {
            error: '403',
            title: 'Forbidden',
            heading: 'Access Denied',
            msg: 'This page is only available for student accounts.',
        });
    }
    next();
};

// Check if student profile is complete, redirect to completion page if not
const requireCompleteProfile = (req, res, next) => {
    // Only check for students
    if (req.user?.role !== 'student') {
        return next();
    }

    // Skip check if already on the profile completion page
    if (req.path === '/complete-profile') {
        return next();
    }

    // Redirect if profile is not complete
    if (!req.user.profileComplete) {
        return res.redirect('/complete-profile');
    }

    next();
};

function extractToken(req) {
    return req.cookies.accessToken;
}

module.exports = {
    requireAuth,
    requireOrganization,
    requireStudent,
    requireCompleteProfile,
};
