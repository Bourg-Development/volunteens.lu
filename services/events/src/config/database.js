module.exports = {
    host: process.env.EVENTS_DB_HOST || 'localhost',
    port: process.env.EVENTS_DB_PORT || 5432,
    database: process.env.EVENTS_DB_NAME || 'volunteens_events',
    username: process.env.EVENTS_DB_USER || 'postgres',
    password: process.env.EVENTS_DB_PASSWORD || 'postgres',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
};
