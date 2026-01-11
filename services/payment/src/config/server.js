const environment = require('./environment');

function normalizePort(val) {
    const portNum = parseInt(val, 10);
    if (isNaN(portNum)) return val;
    if (portNum >= 0) return portNum;
    return false;
}

module.exports = {
    port: normalizePort(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: environment.env,
};
