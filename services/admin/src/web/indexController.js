const { User, ACCOUNT_STATUSES, ROLES, Settings, SETTING_KEYS } = require('../database');
const servicesConfig = require('../config/services');
const logger = require('../utils/logger');
const emailClient = require('../services/emailClient');

const VALID_ROLES = Object.values(ROLES);
const ROLE_HIERARCHY = ['student', 'organization', 'moderator', 'admin', 'super_admin'];

exports.dashboard = async (req, res) => {
    try {
        const [pending, allOrgs, activeOrgs] = await Promise.all([
            User.findAll({ where: { role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUSES.PENDING_AP }, order: [['createdAt', 'ASC']] }),
            User.count({ where: { role: ROLES.ORGANIZATION } }),
            User.count({ where: { role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUSES.ACTIVE } }),
        ]);
        res.render('pages/dashboard', {
            title: 'Dashboard',
            user: req.user,
            authUrl: servicesConfig.auth,
            stats: { pending: pending.length, organizations: allOrgs, active: activeOrgs },
            pending,
            msg: req.query.msg,
            success: req.query.success === '1',
        });
    } catch (err) {
        logger.error('Dashboard error:', err);
        res.status(500).render('pages/dashboard', { title: 'Dashboard', user: req.user, authUrl: servicesConfig.auth, stats: { pending: 0, organizations: 0, active: 0 }, pending: [], msg: 'Error loading dashboard', success: false });
    }
};

exports.pending = async (req, res) => {
    try {
        const users = await User.findAll({ where: { role: ROLES.ORGANIZATION, accountStatus: ACCOUNT_STATUSES.PENDING_AP }, order: [['createdAt', 'ASC']] });
        res.render('pages/pending', { title: 'Pending Approvals', user: req.user, authUrl: servicesConfig.auth, users, msg: req.query.msg, success: req.query.success === '1' });
    } catch (err) {
        logger.error('Pending page error:', err);
        res.status(500).render('pages/pending', { title: 'Pending Approvals', user: req.user, authUrl: servicesConfig.auth, users: [], msg: 'Error loading data', success: false });
    }
};

exports.userDetail = async (req, res) => {
    try {
        const userDetail = await User.findByPk(req.params.userId);
        if (!userDetail) {
            return res.redirect('/?msg=User not found&success=0');
        }
        res.render('pages/user-detail', { title: 'User Details', user: req.user, authUrl: servicesConfig.auth, userDetail, msg: req.query.msg, success: req.query.success === '1' });
    } catch (err) {
        logger.error('User detail error:', err);
        res.redirect('/?msg=Error loading user&success=0');
    }
};

exports.approveUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.userId);
        if (!user) return res.redirect('/pending?msg=User not found&success=0');
        if (user.accountStatus !== ACCOUNT_STATUSES.PENDING_AP) return res.redirect('/pending?msg=User not pending approval&success=0');

        user.accountStatus = ACCOUNT_STATUSES.ACTIVE;
        await user.save();
        logger.info('User approved: ' + user.email + ' by ' + req.user.email);

        // Fetch B2B support email from settings
        let supportEmail = 'b2b@volunteens.lu';
        try {
            const setting = await Settings.findOne({ where: { key: SETTING_KEYS.B2B_SUPPORT_EMAIL } });
            if (setting) supportEmail = setting.value;
        } catch (err) {
            logger.warn('Failed to fetch B2B support email:', err.message);
        }

        // Send welcome email
        emailClient.sendWelcomeOrg({
            to: user.email,
            organizationName: user.organizationName,
            dashboardUrl: servicesConfig.dash,
            supportEmail,
        }).then(result => {
            if (result) {
                logger.info('Welcome email sent to ' + user.email);
            } else {
                logger.error('Failed to send welcome email to ' + user.email);
            }
        }).catch(err => logger.error('Email error:', err.message));

        res.redirect('/pending?msg=User approved successfully&success=1');
    } catch (err) {
        logger.error('Approve error:', err);
        res.redirect('/pending?msg=Error approving user&success=0');
    }
};

exports.rejectUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.userId);
        if (!user) return res.redirect('/pending?msg=User not found&success=0');

        user.accountStatus = ACCOUNT_STATUSES.LOCKED;
        await user.save();
        logger.info('User rejected: ' + user.email + ' by ' + req.user.email);
        res.redirect('/pending?msg=User rejected&success=1');
    } catch (err) {
        logger.error('Reject error:', err);
        res.redirect('/pending?msg=Error rejecting user&success=0');
    }
};

exports.usersPage = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'email', 'role', 'accountStatus', 'firstName', 'lastName', 'organizationName', 'createdAt'],
            order: [['createdAt', 'DESC']],
        });
        res.render('pages/users', { title: 'User Management', user: req.user, authUrl: servicesConfig.auth, users, msg: req.query.msg, success: req.query.success === '1' });
    } catch (err) {
        logger.error('Users page error:', err);
        res.status(500).render('pages/users', { title: 'User Management', user: req.user, authUrl: servicesConfig.auth, users: [], msg: 'Error loading users', success: false });
    }
};

exports.updateRole = async (req, res) => {
    try {
        const { role } = req.body;
        const targetUser = await User.findByPk(req.params.userId);

        if (!targetUser) return res.redirect('/users?msg=User not found&success=0');
        if (!role || !VALID_ROLES.includes(role)) return res.redirect('/users?msg=Invalid role&success=0');
        if (targetUser.id === req.user.id) return res.redirect('/users?msg=Cannot change your own role&success=0');

        const actorRoleIndex = ROLE_HIERARCHY.indexOf(req.user.role);
        const targetCurrentRoleIndex = ROLE_HIERARCHY.indexOf(targetUser.role);

        if (req.user.role !== 'super_admin' && targetCurrentRoleIndex >= actorRoleIndex) {
            return res.redirect('/users?msg=Cannot modify user with equal or higher role&success=0');
        }
        if (req.user.role === 'admin' && role === 'super_admin') {
            return res.redirect('/users?msg=Only super admins can promote to super admin&success=0');
        }

        const oldRole = targetUser.role;
        targetUser.role = role;
        await targetUser.save();

        logger.info('Role updated: ' + targetUser.email + ' from ' + oldRole + ' to ' + role + ' by ' + req.user.email);
        res.redirect('/users?msg=Role updated to ' + role + '&success=1');
    } catch (err) {
        logger.error('Update role error:', err);
        res.redirect('/users?msg=Error updating role&success=0');
    }
};

exports.createUserPage = async (req, res) => {
    res.render('pages/create-user', {
        title: 'Create User',
        user: req.user,
        authUrl: servicesConfig.auth,
        msg: req.query.msg,
        success: req.query.success === '1'
    });
};

exports.createUser = async (req, res) => {
    try {
        const { email, password, role, firstName, lastName, organizationName, organizationType } = req.body;

        if (!email || !password) {
            return res.redirect('/users/create?msg=Email and password are required&success=0');
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.redirect('/users/create?msg=Email already exists&success=0');
        }

        const userRole = role || ROLES.STUDENT;
        if (!VALID_ROLES.includes(userRole)) {
            return res.redirect('/users/create?msg=Invalid role&success=0');
        }

        if (userRole === 'super_admin' && req.user.role !== 'super_admin') {
            return res.redirect('/users/create?msg=Only super admins can create super admin accounts&success=0');
        }

        const newUser = await User.create({
            email,
            password,
            accountStatus: ACCOUNT_STATUSES.ACTIVE,
            firstName: firstName || null,
            lastName: lastName || null,
            organizationName: organizationName || null,
            organizationType: organizationType || null,
            role: userRole,
        });

        logger.info('User created: ' + newUser.email + ' by ' + req.user.email);
        res.redirect('/users?msg=User ' + newUser.email + ' created successfully&success=1');
    } catch (err) {
        logger.error('Create user error:', err);
        res.redirect('/users/create?msg=Error creating user&success=0');
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const targetUser = await User.findByPk(req.params.userId);

        if (!targetUser) return res.redirect('/users?msg=User not found&success=0');
        if (targetUser.id === req.user.id) return res.redirect('/users?msg=Cannot change your own status&success=0');

        const validStatuses = [ACCOUNT_STATUSES.ACTIVE, ACCOUNT_STATUSES.LOCKED];
        if (!status || !validStatuses.includes(status)) {
            return res.redirect('/users?msg=Invalid status&success=0');
        }

        const actorRoleIndex = ROLE_HIERARCHY.indexOf(req.user.role);
        const targetRoleIndex = ROLE_HIERARCHY.indexOf(targetUser.role);
        if (req.user.role !== 'super_admin' && targetRoleIndex >= actorRoleIndex) {
            return res.redirect('/users?msg=Cannot modify user with equal or higher role&success=0');
        }

        const oldStatus = targetUser.accountStatus;
        targetUser.accountStatus = status;
        await targetUser.save();

        const action = status === ACCOUNT_STATUSES.LOCKED ? 'deactivated' : 'activated';
        logger.info('User ' + action + ': ' + targetUser.email + ' by ' + req.user.email);
        res.redirect('/users?msg=User ' + action + ' successfully&success=1');
    } catch (err) {
        logger.error('Update status error:', err);
        res.redirect('/users?msg=Error updating status&success=0');
    }
};
