const logger = require('../utils/logger');
const { sequelize } = require('./database');
const { Event, EVENT_STATUSES } = require('./models/Event');
const { Signup, SIGNUP_STATUSES } = require('./models/Signup');
const { Shift } = require('./models/Shift');
const { ShiftAssignment, ASSIGNMENT_STATUSES } = require('./models/ShiftAssignment');

// Define associations
// Event <-> Signup
Event.hasMany(Signup, { foreignKey: 'eventId', as: 'signups' });
Signup.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

// Event <-> Shift
Event.hasMany(Shift, { foreignKey: 'eventId', as: 'shifts', onDelete: 'CASCADE' });
Shift.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

// Shift <-> ShiftAssignment
Shift.hasMany(ShiftAssignment, { foreignKey: 'shiftId', as: 'assignments', onDelete: 'CASCADE' });
ShiftAssignment.belongsTo(Shift, { foreignKey: 'shiftId', as: 'shift' });

// Signup <-> ShiftAssignment
Signup.hasMany(ShiftAssignment, { foreignKey: 'signupId', as: 'shiftAssignments', onDelete: 'CASCADE' });
ShiftAssignment.belongsTo(Signup, { foreignKey: 'signupId', as: 'signup' });

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
    Event,
    Signup,
    Shift,
    ShiftAssignment,
    EVENT_STATUSES,
    SIGNUP_STATUSES,
    ASSIGNMENT_STATUSES,
    connectWithRetry,
    checkDBHealth,
};
