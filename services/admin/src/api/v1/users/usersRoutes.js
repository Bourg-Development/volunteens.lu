const express = require('express');
const router = express.Router();

const usersController = require('./usersController');
const { adminActionLimiter } = require('../../../middleware/rateLimiter');
const { requirePermission } = require('../../../middleware/auth');

// Permissions constants
const PERMISSIONS = {
    ORGS_VIEW: 'orgs:view',
    ORGS_APPROVE: 'orgs:approve',
    USERS_VIEW: 'users:view',
    USERS_EDIT: 'users:edit',
    ADMINS_EDIT: 'admins:edit',
    ADMINS_CREATE: 'admins:create',
};

// List all users (requires users:view permission)
router.get('/', requirePermission(PERMISSIONS.USERS_VIEW), usersController.listAllUsers);

// List all users pending approval (requires orgs:view permission)
router.get('/pending', requirePermission(PERMISSIONS.ORGS_VIEW), usersController.listPendingApproval);

// Get specific user details (requires users:view permission)
router.get('/:userId', requirePermission(PERMISSIONS.USERS_VIEW), usersController.getUserDetails);

// Create a new user (requires admins:create permission)
router.post('/', requirePermission(PERMISSIONS.ADMINS_CREATE), adminActionLimiter, usersController.createUser);

// Update user role (requires admins:edit permission)
router.put('/:userId/role', requirePermission(PERMISSIONS.ADMINS_EDIT), adminActionLimiter, usersController.updateUserRole);

// Update user status (activate/deactivate) (requires users:edit permission)
router.put('/:userId/status', requirePermission(PERMISSIONS.USERS_EDIT), adminActionLimiter, usersController.updateUserStatus);

// Approve a business user (requires orgs:approve permission)
router.post('/:userId/approve', requirePermission(PERMISSIONS.ORGS_APPROVE), adminActionLimiter, usersController.approveUser);

// Reject a business user (requires orgs:approve permission)
router.post('/:userId/reject', requirePermission(PERMISSIONS.ORGS_APPROVE), adminActionLimiter, usersController.rejectUser);

module.exports = router;
