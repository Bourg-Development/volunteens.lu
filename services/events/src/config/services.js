const environment = require('./environment');

module.exports = {
    auth: process.env.AUTH_URL || 'http://localhost:3002',
    dash: process.env.DASH_URL || 'http://localhost:3000',
    admin: process.env.ADMIN_URL || 'http://localhost:3003',
    events: process.env.EVENTS_URL || 'http://localhost:3004',
    email: process.env.EMAIL_URL || 'http://localhost:3006',
    emailServiceSecret: process.env.EMAIL_SERVICE_SECRET || '',
    payment: process.env.PAYMENT_URL || 'http://localhost:3005',
    paymentInternal: process.env.PAYMENT_INTERNAL_URL || 'http://payment:3000',
    paymentServiceSecret: process.env.PAYMENT_SERVICE_SECRET || '',
    env: environment.env,
};
