const http  = require('http');
const https = require('https');
const config = require('./config/environment');

const app = require('./app');

// Get port from environment or default to 3000
const port = config.web_server.port || 3000;

// Set port in Express
app.set('port', port);

// Create HTTP server
const server = http.createServer(app);

// Error handler for server
const onError = (error) => {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    // Handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
};

// Server listening event handler
const onListening = () => {
    const addr = server.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    console.log('Server listening on ' + bind);
};

// Initialize database and start server
const startServer = async () => {
    server.listen(port, '0.0.0.0');
    server.on('error', onError);
    server.on('listening', onListening);

    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
};

// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('Starting graceful shutdown...');

    try {
        // Close server connections
        server.close(() => {
            console.log('HTTP server closed');
        });
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    gracefulShutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit immediately, log and allow normal handling
});

// Start the server
startServer();