const { Settings, SETTING_KEYS } = require('../../../database');
const logger = require('../../../utils/logger');

// Internal API for other services to fetch settings
exports.getSetting = async (req, res) => {
    try {
        const { key } = req.params;

        if (!Object.values(SETTING_KEYS).includes(key)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid setting key',
            });
        }

        const setting = await Settings.findOne({ where: { key } });
        if (!setting) {
            return res.status(404).json({
                success: false,
                error: 'Setting not found',
            });
        }

        res.json({
            success: true,
            key: setting.key,
            value: setting.value,
        });
    } catch (err) {
        logger.error('Get setting error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to get setting',
        });
    }
};

// Get all settings (internal)
exports.getAllSettings = async (req, res) => {
    try {
        const settings = await Settings.findAll();
        const settingsMap = {};
        settings.forEach(s => {
            settingsMap[s.key] = s.value;
        });

        res.json({
            success: true,
            settings: settingsMap,
        });
    } catch (err) {
        logger.error('Get all settings error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to get settings',
        });
    }
};
