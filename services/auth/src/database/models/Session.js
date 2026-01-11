const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const { User } = require('./User');

const Session = sequelize.define('Session', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
    },
    refreshTokenHash: {
        type: DataTypes.STRING(64), // SHA-256 hex = 64 chars
        allowNull: false,
    },
    fingerprint: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    userAgent: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
    },
    deviceName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    revoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: 'sessions',
    timestamps: true,
});

User.hasMany(Session, { foreignKey: 'userId', onDelete: 'CASCADE' });
Session.belongsTo(User, { foreignKey: 'userId' });

module.exports = { Session };
