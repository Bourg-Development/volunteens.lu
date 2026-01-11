const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const SIGNUP_STATUSES = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
};

const Signup = sequelize.define('Signup', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    eventId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    studentId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'User ID of the student signing up',
    },
    studentEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Student email for notifications',
    },
    studentName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Student name for display',
    },
    status: {
        type: DataTypes.ENUM(Object.values(SIGNUP_STATUSES)),
        allowNull: false,
        defaultValue: SIGNUP_STATUSES.PENDING,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Optional message from student to organizer',
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Internal notes from organizer',
    },
}, {
    tableName: 'signups',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['eventId', 'studentId'],
            name: 'unique_event_student',
        },
    ],
});

module.exports = { Signup, SIGNUP_STATUSES };
