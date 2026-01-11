const logger = require('../utils/logger');
const { sequelize } = require('./database');
const { Invoice, INVOICE_STATUSES } = require('./models/Invoice');

async function connectWithRetry(retries = 5, delay = 3000) {
    for (let i = 1; i <= retries; i++) {
        try {
            await sequelize.authenticate();
            logger.info('Connected to PostgreSQL');

            await sequelize.sync({ alter: true });
            logger.info('Sequelize models synced');

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
    Invoice,
    INVOICE_STATUSES,
    connectWithRetry,
    checkDBHealth,
};
