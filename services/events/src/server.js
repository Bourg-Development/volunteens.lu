const app = require('./app');
const serverConfig = require('./config/server');
const { connectWithRetry } = require('./database');
const logger = require('./utils/logger');

async function start() {
    await connectWithRetry();

    app.listen(serverConfig.port, serverConfig.host, () => {
        logger.info(`Events service running on http://${serverConfig.host}:${serverConfig.port}`);
    });
}

start().catch(err => {
    logger.fatal('Failed to start server:', err);
    process.exit(1);
});
