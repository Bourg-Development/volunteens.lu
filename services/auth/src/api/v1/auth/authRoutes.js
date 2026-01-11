const express = require('express');
const router = express.Router();
const authController = require('./authController');
const { loginLimiter, registerLimiter, refreshLimiter } = require('../../../middleware/rateLimiter');
const { requireAuth } = require('../../../middleware/auth');

router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.get('/refresh', refreshLimiter, authController.refresh);
router.get('/verify/:token', authController.verify);
router.get('/logout', authController.logout);
router.get('/status', authController.status);

// Password reset routes
router.post('/forgot-password', loginLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Profile routes (require authentication)
router.get('/profile', requireAuth, authController.getProfile);
router.put('/profile', requireAuth, authController.updateProfile);

module.exports = router;
