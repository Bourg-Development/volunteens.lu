const { User, ACCOUNT_STATUSES, ROLES, Settings, SETTING_KEYS } = require('../../../database');
const logger = require('../../../utils/logger');
const emailClient = require('../../../services/emailClient');
const services = require('../../../config/services');

const VALID_ROLES = Object.values(ROLES);
const ROLE_HIERARCHY = ['student', 'organization', 'moderator', 'admin', 'super_admin'];

/**
 * List all users pending approval (organizations)
 */
exports.listPendingApproval = async (req, res) => {
    try {
        const pendingUsers = await User.findAll({
            where: {
                role: ROLES.ORGANIZATION,
                accountStatus: ACCOUNT_STATUSES.PENDING_AP,
            },
            attributes: ['id', 'email', 'organizationName', 'organizationType', 'accountStatus', 'role', 'createdAt'],
            order: [['createdAt', 'ASC']],
        });

        res.json({
            success: true,
            count: pendingUsers.length,
            users: pendingUsers,
        });
    } catch (err) {
        logger.error('Error fetching pending approval users:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pending users',
        });
    }
};

/**
 * Approve a business user
 */
exports.approveUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required',
            });
        }

        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        if (user.role !== ROLES.ORGANIZATION) {
            return res.status(400).json({
                success: false,
                error: 'Only organization accounts can be approved',
            });
        }

        if (user.accountStatus !== ACCOUNT_STATUSES.PENDING_AP) {
            return res.status(400).json({
                success: false,
                error: `User is not pending approval. Current status: ${user.accountStatus}`,
            });
        }

        // Update user status to active
        user.accountStatus = ACCOUNT_STATUSES.ACTIVE;
        await user.save();

        logger.info(`Business user approved: ${user.email} (${user.id}) by admin ${req.user.email}`);

        // Fetch B2B support email from settings
        let supportEmail = 'b2b@volunteens.lu'; // fallback
        try {
            const setting = await Settings.findOne({ where: { key: SETTING_KEYS.B2B_SUPPORT_EMAIL } });
            if (setting) {
                supportEmail = setting.value;
                logger.info(`Using B2B support email from settings: ${supportEmail}`);
            } else {
                logger.warn('B2B support email setting not found, using fallback');
            }
        } catch (err) {
            logger.warn('Failed to fetch B2B support email setting:', err.message);
        }

        // Send welcome email to the approved organization
        logger.info(`Attempting to send welcome email to ${user.email}`);
        emailClient.sendWelcomeOrg({
            to: user.email,
            organizationName: user.organizationName,
            dashboardUrl: services.dash,
            supportEmail,
        }).then(result => {
            if (result) {
                logger.info(`Welcome email sent successfully to ${user.email}`);
            } else {
                logger.error(`Failed to send welcome email to ${user.email} - emailClient returned false`);
            }
        }).catch(err => logger.error(`Failed to send welcome email to ${user.email}:`, err.message));

        res.json({
            success: true,
            message: 'User approved successfully',
            user: {
                id: user.id,
                email: user.email,
                organizationName: user.organizationName,
                accountStatus: user.accountStatus,
            },
        });
    } catch (err) {
        logger.error('Error approving user:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to approve user',
        });
    }
};

/**
 * Reject a business user (set status to locked or delete)
 */
exports.rejectUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason, deleteAccount } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required',
            });
        }

        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        if (user.role !== ROLES.ORGANIZATION) {
            return res.status(400).json({
                success: false,
                error: 'Only organization accounts can be rejected',
            });
        }

        if (user.accountStatus !== ACCOUNT_STATUSES.PENDING_AP) {
            return res.status(400).json({
                success: false,
                error: `User is not pending approval. Current status: ${user.accountStatus}`,
            });
        }

        if (deleteAccount === true) {
            // Delete the account entirely
            await user.destroy();
            logger.info(`Business user rejected and deleted: ${user.email} (${user.id}) by admin ${req.user.email}. Reason: ${reason || 'No reason provided'}`);

            return res.json({
                success: true,
                message: 'User rejected and deleted successfully',
            });
        }

        // Lock the account
        user.accountStatus = ACCOUNT_STATUSES.LOCKED;
        await user.save();

        logger.info(`Business user rejected: ${user.email} (${user.id}) by admin ${req.user.email}. Reason: ${reason || 'No reason provided'}`);

        res.json({
            success: true,
            message: 'User rejected successfully',
            user: {
                id: user.id,
                email: user.email,
                organizationName: user.organizationName,
                accountStatus: user.accountStatus,
            },
        });
    } catch (err) {
        logger.error('Error rejecting user:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to reject user',
        });
    }
};

/**
 * Get details of a specific user
 */
exports.getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required',
            });
        }

        const user = await User.findByPk(userId, {
            attributes: ['id', 'email', 'role', 'accountStatus', 'firstName', 'lastName', 'organizationName', 'organizationType', 'createdAt', 'updatedAt'],
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        res.json({
            success: true,
            user,
        });
    } catch (err) {
        logger.error('Error fetching user details:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user details',
        });
    }
};

/**
 * List all users
 */
exports.listAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'email', 'role', 'accountStatus', 'firstName', 'lastName', 'organizationName', 'createdAt'],
            order: [['createdAt', 'DESC']],
        });

        res.json({
            success: true,
            count: users.length,
            users,
        });
    } catch (err) {
        logger.error('Error fetching users:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
        });
    }
};

/**
 * Update a user's role
 */
exports.updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID is required' });
        }

        if (!role || !VALID_ROLES.includes(role)) {
            return res.status(400).json({ success: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Prevent self-demotion
        if (user.id === req.user.id) {
            return res.status(400).json({ success: false, error: 'Cannot change your own role' });
        }

        const actorRoleIndex = ROLE_HIERARCHY.indexOf(req.user.role);
        const targetCurrentRoleIndex = ROLE_HIERARCHY.indexOf(user.role);
        const targetNewRoleIndex = ROLE_HIERARCHY.indexOf(role);

        // Can't modify someone with equal or higher role (unless super_admin)
        if (req.user.role !== 'super_admin' && targetCurrentRoleIndex >= actorRoleIndex) {
            return res.status(403).json({ success: false, error: 'Cannot modify user with equal or higher role' });
        }

        // Admin can only promote up to admin (not super_admin)
        if (req.user.role === 'admin' && role === 'super_admin') {
            return res.status(403).json({ success: false, error: 'Only super admins can promote to super admin' });
        }

        const oldRole = user.role;
        user.role = role;
        await user.save();

        logger.info(`Role updated: ${user.email} from ${oldRole} to ${role} by ${req.user.email}`);

        res.json({
            success: true,
            message: 'Role updated successfully',
            user: { id: user.id, email: user.email, role: user.role },
        });
    } catch (err) {
        logger.error('Error updating user role:', err);
        res.status(500).json({ success: false, error: 'Failed to update role' });
    }
};

/**
 * Create/invite a new user
 */
exports.createUser = async (req, res) => {
    try {
        const { email, password, role, firstName, lastName, organizationName, organizationType } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Email already exists' });
        }

        const userRole = role || ROLES.STUDENT;
        if (!VALID_ROLES.includes(userRole)) {
            return res.status(400).json({ success: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
        }

        // Check role assignment permissions
        if (userRole === 'super_admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, error: 'Only super admins can create super admin accounts' });
        }

        const newUser = await User.create({
            email,
            password,
            accountStatus: ACCOUNT_STATUSES.ACTIVE,
            firstName,
            lastName,
            organizationName,
            organizationType,
            role: userRole,
        });

        logger.info(`User created: ${newUser.email} by admin ${req.user.email}`);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: { id: newUser.id, email: newUser.email, role: newUser.role },
        });
    } catch (err) {
        logger.error('Error creating user:', err);
        res.status(500).json({ success: false, error: 'Failed to create user' });
    }
};

/**
 * Update user account status (activate/deactivate)
 */
exports.updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID is required' });
        }

        const validStatuses = [ACCOUNT_STATUSES.ACTIVE, ACCOUNT_STATUSES.LOCKED];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Prevent self-deactivation
        if (user.id === req.user.id) {
            return res.status(400).json({ success: false, error: 'Cannot change your own account status' });
        }

        // Can't deactivate someone with equal or higher role (unless super_admin)
        const actorRoleIndex = ROLE_HIERARCHY.indexOf(req.user.role);
        const targetRoleIndex = ROLE_HIERARCHY.indexOf(user.role);
        if (req.user.role !== 'super_admin' && targetRoleIndex >= actorRoleIndex) {
            return res.status(403).json({ success: false, error: 'Cannot modify user with equal or higher role' });
        }

        const oldStatus = user.accountStatus;
        user.accountStatus = status;
        await user.save();

        logger.info(`User status updated: ${user.email} from ${oldStatus} to ${status} by ${req.user.email}`);

        res.json({
            success: true,
            message: `User ${status === ACCOUNT_STATUSES.LOCKED ? 'deactivated' : 'activated'} successfully`,
            user: { id: user.id, email: user.email, accountStatus: user.accountStatus },
        });
    } catch (err) {
        logger.error('Error updating user status:', err);
        res.status(500).json({ success: false, error: 'Failed to update user status' });
    }
};
