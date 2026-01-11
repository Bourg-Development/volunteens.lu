const pino = require('pino');

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    base: { service: 'volunteens-email', env: process.env.NODE_ENV },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level(label) { return { level: label.toUpperCase() }; }
    },
});

module.exports = logger;