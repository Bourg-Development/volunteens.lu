const environment = require('./environment');

module.exports = {
    env: environment.env,
    emailServiceSecret: process.env.emailServiceSecret
};