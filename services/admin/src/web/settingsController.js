const { Settings, SETTING_KEYS } = require('../database');
const servicesConfig = require('../config/services');
const logger = require('../utils/logger');

exports.settingsPage = async (req, res) => {
    try {
        const settings = await Settings.findAll({ order: [['key', 'ASC']] });

        const settingsMap = {};
        settings.forEach(s => {
            settingsMap[s.key] = s;
        });

        res.render('pages/settings', {
            title: 'Settings',
            user: req.user,
            authUrl: servicesConfig.auth,
            settings: settingsMap,
            SETTING_KEYS,
            msg: req.query.msg,
            success: req.query.success === '1',
        });
    } catch (err) {
        logger.error('Settings page error:', err);
        res.status(500).render('pages/settings', {
            title: 'Settings',
            user: req.user,
            authUrl: servicesConfig.auth,
            settings: {},
            SETTING_KEYS,
            msg: 'Error loading settings',
            success: false,
        });
    }
};

exports.updateSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (!Object.values(SETTING_KEYS).includes(key)) {
            return res.redirect('/settings?msg=Invalid setting key&success=0');
        }

        if (value === undefined || value === null || value === '') {
            return res.redirect('/settings?msg=Value is required&success=0');
        }

        // Validate hourly rate is a positive number
        if (key === SETTING_KEYS.HOURLY_RATE) {
            const rate = parseFloat(value);
            if (isNaN(rate) || rate < 0) {
                return res.redirect('/settings?msg=Hourly rate must be a positive number&success=0');
            }
        }

        const setting = await Settings.findOne({ where: { key } });
        if (!setting) {
            return res.redirect('/settings?msg=Setting not found&success=0');
        }

        setting.value = value;
        setting.updatedBy = req.user.id;
        await setting.save();

        logger.info(`Setting updated: ${key} = ${value} by ${req.user.email}`);
        res.redirect('/settings?msg=Setting updated successfully&success=1');
    } catch (err) {
        logger.error('Update setting error:', err);
        res.redirect('/settings?msg=Error updating setting&success=0');
    }
};
