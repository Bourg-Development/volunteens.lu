module.exports = {
    host: process.env.PAYMENT_DB_HOST || 'localhost',
    port: process.env.PAYMENT_DB_PORT || 5432,
    database: process.env.PAYMENT_DB_NAME || 'volunteens_payment',
    username: process.env.PAYMENT_DB_USER || 'postgres',
    password: process.env.PAYMENT_DB_PASSWORD || 'postgres',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
};
