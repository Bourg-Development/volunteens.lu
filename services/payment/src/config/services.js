const environment = require('./environment');

module.exports = {
    auth: process.env.AUTH_URL || 'http://localhost:3002',
    authInternal: process.env.AUTH_INTERNAL_URL || 'http://auth:3000',
    admin: process.env.ADMIN_URL || 'http://localhost:3003',
    adminInternal: process.env.ADMIN_INTERNAL_URL || 'http://admin:3000',
    email: process.env.EMAIL_URL || 'http://localhost:3006',
    emailInternal: process.env.EMAIL_INTERNAL_URL || 'http://email:3000',
    emailServiceSecret: process.env.EMAIL_SERVICE_SECRET || '',
    adminServiceSecret: process.env.ADMIN_SERVICE_SECRET || '',
    paymentServiceSecret: process.env.PAYMENT_SERVICE_SECRET || '',
    env: environment.env,
};
