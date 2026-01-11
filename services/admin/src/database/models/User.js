const { DataTypes } = require('sequelize');
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
    },
}, {
    tableName: 'users',
    timestamps: true,
});

module.exports = { User, ORGANIZATION_TYPES, ACCOUNT_STATUSES, ROLES };
