const environment = require('./environment');

function normalizePort(val) {
    const port = parseInt(val, 10);
    if (isNaN(port)) return val;
    if (port >= 0) return port;
    return false;
}

module.exports = {
    port: normalizePort(process.env.ADMIN_PORT || '3003'),
    host: process.env.ADMIN_HOST || '0.0.0.0',
    env: environment.env,
};
