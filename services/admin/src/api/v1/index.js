const express = require('express');
const router = express.Router();

const usersRoutes = require('./users/usersRoutes');
const settingsRoutes = require('./settings/settingsRoutes');
const contentRoutes = require('./content/contentRoutes');
const contentController = require('./content/contentController');
const { requireAdmin } = require('../../middleware/auth');
const { apiLimiter } = require('../../middleware/rateLimiter');

// Apply rate limiting to all routes
router.use(apiLimiter);

// Health check endpoint (no auth required)
router.get('/health', (req, res) => {
    res.json({ success: true, status: 'healthy' });
});

// Public content API (for web-ui to fetch CMS content)
router.get('/public/content', contentController.getPublicAll);
router.get('/public/content/:pageKey', contentController.getPublicPage);

// Internal routes (service-to-service, uses secret auth)
router.use('/internal/settings', settingsRoutes);

// Admin-protected routes
router.use('/users', requireAdmin, usersRoutes);
router.use('/content', requireAdmin, contentRoutes);

router.use((req, res) => {
    res.status(404).json({ success: false, code: 404, error: "This resource couldn't be found" });
});

module.exports = router;
