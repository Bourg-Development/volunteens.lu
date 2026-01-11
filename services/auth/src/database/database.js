const { Sequelize } = require('sequelize');
const dbConfig = require('../config/database');

const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.user,
    dbConfig.password,
    {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: 'postgres',
        logging: false,
        pool: {
            max: dbConfig.maxPool,
            idle: dbConfig.idleTimeoutMillis,
            acquire: dbConfig.connectionTimeoutMillis,
        },
    }
);

module.exports = { sequelize };
