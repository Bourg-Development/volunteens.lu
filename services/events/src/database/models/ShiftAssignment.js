const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const ASSIGNMENT_STATUSES = {
    ASSIGNED: 'assigned',
    ATTENDED: 'attended',
    NO_SHOW: 'no_show',
};

const ShiftAssignment = sequelize.define('ShiftAssignment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    shiftId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    signupId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM(Object.values(ASSIGNMENT_STATUSES)),
        allowNull: false,
        defaultValue: ASSIGNMENT_STATUSES.ASSIGNED,
    },
}, {
    tableName: 'shift_assignments',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['shiftId', 'signupId'],
            name: 'unique_shift_signup',
        },
        { fields: ['signupId'] },
        { fields: ['status'] },
    ],
});

module.exports = { ShiftAssignment, ASSIGNMENT_STATUSES };
