const environment = require('./environment');

module.exports = {
    auth: process.env.AUTH_URL || "http://localhost:3002",
    events: process.env.EVENTS_URL || "http://localhost:3004",
    eventsInternal: "http://events:3000",
    payment: process.env.PAYMENT_URL || "http://localhost:3005",
    paymentInternal: "http://payment:3000",
    adminInternal: process.env.ADMIN_INTERNAL_URL || 'http://admin:3000',
    adminServiceSecret: process.env.ADMIN_SERVICE_SECRET || '',
    env: environment.env,
};