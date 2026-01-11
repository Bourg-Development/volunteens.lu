require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

module.exports = {
    env,
    isProduction: env === 'production',
    isDevelopment: env === 'development',
};