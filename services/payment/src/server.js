const http = require('http');
const serverConfig = require('./config/server');
const app = require('./app');
const logger = require('./utils/logger');
const { connectWithRetry } = require('./database');

const port = serverConfig.port;
app.set('port', port);

const server = http.createServer(app);

server.on('listening', onListening);
server.on('error', onError);

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Connect to database then start server
connectWithRetry().then(() => {
    server.listen(port);
}).catch(err => {
    logger.fatal('Failed to connect to database:', err);
    process.exit(1);
});

function onError(error) {
    if (error.syscall !== 'listen') throw error;

    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    switch (error.code) {
        case 'EACCES':
            logger.error(`${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            logger.error(`${bind} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
}

function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    logger.info('Listening on ' + bind);
    logger.info(`Payment service running on http://localhost:${addr.port}`);
}

function gracefulShutdown(signal) {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
        logger.info('Closed all remaining connections');
        process.exit(0);
    });
    setTimeout(() => {
        logger.error('Force shutdown after timeout');
        process.exit(1);
    }, 5000);
}
