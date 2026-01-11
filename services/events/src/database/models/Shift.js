const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Shift = sequelize.define('Shift', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    eventId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'The date of the shift (YYYY-MM-DD)',
    },
    startTime: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'Start time of the shift (HH:MM:SS)',
    },
    endTime: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'End time of the shift (HH:MM:SS)',
    },
}, {
    tableName: 'shifts',
    timestamps: true,
    indexes: [
        { fields: ['eventId'] },
        { fields: ['date'] },
    ],
});

/**
 * Calculate the duration of the shift in hours
 * @returns {number} Duration in hours
 */
Shift.prototype.getDurationHours = function() {
    const [startH, startM] = this.startTime.split(':').map(Number);
    const [endH, endM] = this.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return (endMinutes - startMinutes) / 60;
};

module.exports = { Shift };
