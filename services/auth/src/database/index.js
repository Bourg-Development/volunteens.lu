const logger = require('../utils/logger');
const { sequelize } = require('./database');
const { User, ORGANIZATION_TYPES, ACCOUNT_STATUSES, ROLES, PERMISSIONS, ROLE_PERMISSIONS } = require('./models/User');
const { Session } = require('./models/Session');
const { OTP, OTP_TYPES } = require('./models/OTP');

async function connectWithRetry(retries = 5, delay = 3000) {
    for (let i = 1; i <= retries; i++) {
        try {
            await sequelize.authenticate();
            logger.info('Connected to PostgreSQL');

            await sequelize.sync({ alter: true });
            logger.info('Sequelize models synced');

            // Seed default admin on first run
            await seedDefaultAdmin();

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

/**
 * Create default super admin if no admin exists
 */
async function seedDefaultAdmin() {
    logger.info('Checking for default admin...');
    try {
        // Check if any super admin exists
        const existingAdmin = await User.findOne({
            where: { role: ROLES.SUPER_ADMIN }
        });

        if (existingAdmin) {
            logger.info(`Super admin already exists: ${existingAdmin.email}`);
            return;
        }

        // Get admin credentials from environment
        const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@volunteens.lu';
        const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!';

        logger.info(`No super admin found, will create: ${adminEmail}`);

        // Check if user with this email already exists
        const existingUser = await User.findOne({ where: { email: adminEmail } });

        if (existingUser) {
            // Upgrade existing user to super admin
            existingUser.role = ROLES.SUPER_ADMIN;
            existingUser.accountStatus = ACCOUNT_STATUSES.ACTIVE;
            await existingUser.save();
            logger.info(`Upgraded existing user ${adminEmail} to super admin`);
        } else {
            // Create new super admin
            const newAdmin = await User.create({
                email: adminEmail,
                password: adminPassword,
                firstName: 'Super',
                lastName: 'Admin',
                accountStatus: ACCOUNT_STATUSES.ACTIVE,
                role: ROLES.SUPER_ADMIN,
                permissions: [],
            });
            logger.info(`Created default super admin: ${adminEmail} (ID: ${newAdmin.id})`);
            logger.warn('!!! IMPORTANT: Change the default admin password immediately !!!');
        }
    } catch (err) {
        logger.error('Failed to seed default admin:', err.message);
        logger.error(err.stack);
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
    Session,
    OTP,
    OTP_TYPES,
    ORGANIZATION_TYPES,
    ACCOUNT_STATUSES,
    ROLES,
    PERMISSIONS,
    ROLE_PERMISSIONS,
    connectWithRetry,
    checkDBHealth,
};
