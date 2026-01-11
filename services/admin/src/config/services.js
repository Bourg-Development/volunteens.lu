const environment = require('./environment');

module.exports = {
    // Public URLs (for browser redirects)
    auth: process.env.AUTH_URL || "http://localhost:3002",
    dash: process.env.DASH_URL || "http://localhost:3000",
    admin: process.env.ADMIN_URL || "http://localhost:3003",
    // Internal service URLs
    events: process.env.EVENTS_URL || "http://localhost:3004",
    email: process.env.EMAIL_URL || "http://localhost:3006",
    emailServiceSecret: process.env.EMAIL_SERVICE_SECRET || '',
    env: environment.env,
};
