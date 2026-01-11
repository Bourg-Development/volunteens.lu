const environment = require('./environment');

const baseConfig = {
    user: process.env.AUTH_DB_USER || 'user',
    password: process.env.AUTH_DB_PASSWORD || 'password',
    host: process.env.AUTH_DB_HOST || 'localhost',
    database: process.env.AUTH_DB_NAME,
    port: parseInt(process.env.AUTH_DB_PORT, 10) || 5432,
    maxPool: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
}

module.exports = {
    ...baseConfig,
};