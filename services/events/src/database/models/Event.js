const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const EVENT_STATUSES = {
    DRAFT: 'draft',
    PENDING: 'pending',
    PUBLISHED: 'published',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
};

const Event = sequelize.define('Event', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'User ID of the organization that created this event',
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    capacity: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Max number of signups, null = unlimited',
    },
    hourlyRate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM(Object.values(EVENT_STATUSES)),
        allowNull: false,
        defaultValue: EVENT_STATUSES.DRAFT,
    },
    requirements: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Requirements or skills needed for volunteers',
    },
    contactEmail: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    contactPhone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    signupDeadline: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Deadline for signups, defaults to 5 days before event if not set',
    },
}, {
    tableName: 'events',
    timestamps: true,
});

module.exports = { Event, EVENT_STATUSES };
