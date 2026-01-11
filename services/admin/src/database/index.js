const logger = require('../utils/logger');
const { sequelize } = require('./database');
const { User, ORGANIZATION_TYPES, ACCOUNT_STATUSES, ROLES } = require('./models/User');
const { Settings, SETTING_KEYS, ensureDefaultSettings } = require('./models/Settings');

async function connectWithRetry(retries = 5, delay = 3000) {
    for (let i = 1; i <= retries; i++) {
        try {
            await sequelize.authenticate();
            logger.info('Connected to PostgreSQL');

            // Sync settings table (admin service owns this table)
            logger.info('Syncing Settings table...');
            await Settings.sync({ alter: true });
            logger.info('Settings table synced, ensuring defaults...');
            await ensureDefaultSettings();

            // Verify settings were created
            const allSettings = await Settings.findAll();
            logger.info(`Settings in database: ${allSettings.map(s => s.key).join(', ') || 'none'}`);

            logger.info('Database connection established');
            return;
        } catch (err) {
            logger.error(`PostgreSQL connection failed (attempt ${i}): ${err.message}`);
            if (i < retries) {
                logger.info(`Retrying in ${delay / 1000}s...`);
                await new Promise(r => setTimeout(r, delay));
            } else {
                logger.fatal('Could not connect to PostgreSQL after multiple attempts. Exiting.');
                process.exit(1);
            }
        }
    }
}

async function checkDBHealth() {
    try {
        await sequelize.authenticate();
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    sequelize,
    User,
    ORGANIZATION_TYPES,
    ACCOUNT_STATUSES,
    ROLES,
    Settings,
    SETTING_KEYS,
    connectWithRetry,
    checkDBHealth,
};
