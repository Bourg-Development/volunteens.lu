const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const { User } = require('./User');

const OTP_TYPES = {
    EMAIL_VERIFICATION: 'email_verification',
    PASSWORD_RESET: 'password_reset'
};
const EXPIRY_BY_TYPE = {
    email_verification: 24 * 60 * 60 * 1000, // 24h
    password_reset: 15 * 60 * 1000,          // 15 min
};

const OTP = sequelize.define('OTP', {
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
    token: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM(Object.values(OTP_TYPES)),
        allowNull: false,
    },
    used: {
        type: DataTypes.BOOLEAN,
        allowNull: false ,
        defaultValue: false
    },
    usedAt:{
        type: DataTypes.DATE,
        allowNull: true,
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
    }
}, {
    tableName: 'otp',
    timestamps: true,
    hooks: {
        beforeValidate(otp) {
            if (!otp.expiresAt) {
                const ttl = EXPIRY_BY_TYPE[otp.type];
                if (!ttl) throw new Error(`Unknown OTP type: ${otp.type}`);
                otp.expiresAt = new Date(Date.now() + ttl);
            }
        }
    }

});

User.hasMany(OTP, { foreignKey: 'userId', onDelete: 'CASCADE' });
OTP.belongsTo(User, { foreignKey: 'userId' });

module.exports = { OTP, OTP_TYPES };
