const environment = require('./environment');

module.exports = {
    auth: process.env.AUTH_URL || "localhost:3002",
    dash: process.env.DASH_URL || "localhost:3000",
    admin: process.env.ADMIN_URL || "localhost:3003",
    email: process.env.EMAIL_URL || 'http://localhost:3006',
    webUi: process.env.WEB_UI_URL || 'http://localhost:3001',
    emailServiceSecret: process.env.EMAIL_SERVICE_SECRET || '',

    env: environment.env,
};