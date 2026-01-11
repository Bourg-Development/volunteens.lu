const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const serverConfig = require('./config/server');
const app = require('./app');
const { connectWithRetry } = require('./database');
const logger = require("./utils/logger");
const port = serverConfig.port;

app.set('port', port);

const useHttps =
    process.env.NODE_ENV === 'production' &&
    fs.existsSync(path.resolve(__dirname, process.env.SSL_KEY_PATH)) &&
    fs.existsSync(path.resolve(__dirname, process.env.SSL_CERT_PATH)) &&
    fs.existsSync(path.resolve(__dirname, process.env.SSL_CA_PATH));

let server;
if(useHttps){
    const sslOptions = {
        key: fs.readFileSync(path.resolve(__dirname, process.env.SSL_KEY_PATH)),
        cert: fs.readFileSync(path.resolve(__dirname, process.env.SSL_CERT_PATH)),
        ca: fs.readFileSync(path.resolve(__dirname, process.env.SSL_CA_PATH)),
    };
    server = https.createServer(sslOptions, app);
}else{
    server = http.createServer(app);
}

server.on('listening', onListening);
server.on('error', onError);

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

connectWithRetry().then(() => {
    server.listen(port);
}).catch((err) => {
    logger.fatal('Could not start server due to DB error', err);
    process.exit(1)
})

function onError(error) {
    if (error.syscall !== 'listen') throw error;

    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    switch (error.code) {
        case 'EACCES':
            logger.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            logger.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

function onListening(){
    const addr = server.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    logger.info('Listening on ' + bind);
    logger.info('Server started on ' + (useHttps ? 'https' : 'http') + '://localhost:' + addr.port);
}

function gracefulShutdown(signal) {
    logger.info('Received ' + signal + ', shutting down gracefully...');
    server.close(() => {
        logger.info('Closed all remaining connections');
        process.exit(0);
    });
    setTimeout(() => {
        logger.error('Force shutdown after timeout');
        process.exit(1);
    }, 5000);
}
