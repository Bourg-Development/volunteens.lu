const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const SETTING_KEYS = {
    HOURLY_RATE: 'hourly_rate',
    B2B_SUPPORT_EMAIL: 'b2b_support_email',
};

const Settings = sequelize.define('Settings', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    value: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    updatedBy: {
        type: DataTypes.UUID,
        allowNull: true,
    },
}, {
    tableName: 'settings',
    timestamps: true,
});

const DEFAULT_SETTINGS = [
    {
        key: SETTING_KEYS.HOURLY_RATE,
        value: '15.00',
        description: 'Hourly rate for volunteer work (EUR)',
    },
    {
        key: SETTING_KEYS.B2B_SUPPORT_EMAIL,
        value: 'b2b@volunteens.lu',
        description: 'B2B support email for organization inquiries',
    },
];

async function ensureDefaultSettings() {
    for (const setting of DEFAULT_SETTINGS) {
        const existing = await Settings.findOne({ where: { key: setting.key } });
        if (!existing) {
            console.log(`Creating default setting: ${setting.key}`);
            await Settings.create(setting);
        } else {
            console.log(`Setting already exists: ${setting.key}`);
        }
    }
}

module.exports = { Settings, SETTING_KEYS, ensureDefaultSettings };
