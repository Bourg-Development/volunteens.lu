const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('../database');

const ORGANIZATION_TYPES = {
    values: ['tech', 'marketing']
};

const ACCOUNT_STATUSES = {
    LOCKED: 'locked',
    ACTIVE: 'active',
    PENDING_AP: 'pending_approval',
    PENDING_VE: 'pending_verification'
};

// Unified roles (includes former account types)
const ROLES = {
    STUDENT: 'student',
    ORGANIZATION: 'organization',
    MODERATOR: 'moderator',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
};

// Granular permissions
const PERMISSIONS = {
    // User management
    USERS_VIEW: 'users:view',
    USERS_EDIT: 'users:edit',
    USERS_DELETE: 'users:delete',
    USERS_APPROVE: 'users:approve',

    // Organization management
    ORGS_VIEW: 'orgs:view',
    ORGS_EDIT: 'orgs:edit',
    ORGS_DELETE: 'orgs:delete',
    ORGS_APPROVE: 'orgs:approve',

    // Admin management
    ADMINS_VIEW: 'admins:view',
    ADMINS_CREATE: 'admins:create',
    ADMINS_EDIT: 'admins:edit',
    ADMINS_DELETE: 'admins:delete',

    // System
    SYSTEM_SETTINGS: 'system:settings',
    SYSTEM_LOGS: 'system:logs',
};

// Default permissions per role
const ROLE_PERMISSIONS = {
    [ROLES.STUDENT]: [],
    [ROLES.ORGANIZATION]: [],
    [ROLES.MODERATOR]: [
        PERMISSIONS.USERS_VIEW,
        PERMISSIONS.ORGS_VIEW,
    ],
    [ROLES.ADMIN]: [
        PERMISSIONS.USERS_VIEW,
        PERMISSIONS.USERS_EDIT,
        PERMISSIONS.USERS_APPROVE,
        PERMISSIONS.ORGS_VIEW,
        PERMISSIONS.ORGS_EDIT,
        PERMISSIONS.ORGS_APPROVE,
        PERMISSIONS.ADMINS_VIEW,
        PERMISSIONS.ADMINS_CREATE,
        PERMISSIONS.ADMINS_EDIT,
    ],
    [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // All permissions
};

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    accountStatus: {
        type: DataTypes.ENUM(ACCOUNT_STATUSES.ACTIVE, ACCOUNT_STATUSES.LOCKED, ACCOUNT_STATUSES.PENDING_AP, ACCOUNT_STATUSES.PENDING_VE),
        allowNull: false,
        defaultValue: ACCOUNT_STATUSES.PENDING_VE,
    },
    // Student fields
    firstName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // Address fields
    street: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    postalCode: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    country: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Luxembourg',
    },
    // Bank details (for student payments)
    iban: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    bic: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    bankName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    accountHolderName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // Profile completion flag
    profileComplete: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    // Terms and privacy policy consent
    termsAcceptedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    // Organization fields
    organizationName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    organizationType: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // Role (unified - includes student, organization, moderator, admin, super_admin)
    role: {
        type: DataTypes.ENUM(Object.values(ROLES)),
        allowNull: false,
        defaultValue: ROLES.STUDENT,
    },
    permissions: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: 'Additional permissions beyond role defaults',
    },
}, {
    tableName: 'users',
    timestamps: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
    },
});

User.prototype.validatePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

/**
 * Check if user has a specific permission
 * Checks both role-based permissions and custom permissions
 */
User.prototype.hasPermission = function (permission) {
    // Super admin has all permissions
    if (this.role === ROLES.SUPER_ADMIN) return true;

    // Get role-based permissions
    const rolePerms = ROLE_PERMISSIONS[this.role] || [];

    // Get custom permissions
    const customPerms = this.permissions || [];

    // Check if permission exists in either
    return rolePerms.includes(permission) || customPerms.includes(permission);
};

/**
 * Get all effective permissions for this user
 */
User.prototype.getEffectivePermissions = function () {
    const rolePerms = ROLE_PERMISSIONS[this.role] || [];
    const customPerms = this.permissions || [];
    return [...new Set([...rolePerms, ...customPerms])];
};

/**
 * Check if user has admin-level access (moderator, admin or super_admin role)
 */
User.prototype.isAdmin = function () {
    return this.role === ROLES.MODERATOR || this.role === ROLES.ADMIN || this.role === ROLES.SUPER_ADMIN;
};

/**
 * Check if user is a regular user (student or organization)
 */
User.prototype.isRegularUser = function () {
    return this.role === ROLES.STUDENT || this.role === ROLES.ORGANIZATION;
};

module.exports = {
    User,
    ORGANIZATION_TYPES,
    ACCOUNT_STATUSES,
    ROLES,
    PERMISSIONS,
    ROLE_PERMISSIONS,
};
