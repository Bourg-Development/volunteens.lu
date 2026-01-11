const pino = require('pino');

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    base: { service: 'volunteens-admin', env: process.env.NODE_ENV },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters:{
        level(label) {return {level: label.toUpperCase()};}
    },
    transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard'
        }
    } : undefined
});


module.exports = logger;