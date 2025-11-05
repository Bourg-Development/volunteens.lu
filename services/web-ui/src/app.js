const express = require('express');
const ejsLayouts = require('express-ejs-layouts');
const path = require("node:path");
const fs = require('fs');

const app = express();
const startTime = Date.now();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(ejsLayouts)

app.get('/', (req, res) => {
    res.render('pages/home.ejs', { layout: 'layouts/default.ejs' })
})
app.get('/about-us', (req, res) => {
    res.render('pages/about.ejs', { layout: 'layouts/default.ejs' })
})
app.get('/contact', (req, res) => {
    res.render('pages/contact.ejs', { layout: 'layouts/default.ejs' })
})
app.get('/events', (req, res) => {
    res.render('pages/events.ejs', { layout: 'layouts/default.ejs' })
})

// Health check endpoint
app.get('/health', (req, res) => {
    const checks = {
        service: 'web-ui',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
        status: 'ok',
        checks: {}
    };

    // Views directory check
    const viewsPath = path.join(__dirname, 'views');
    try {
        fs.accessSync(viewsPath, fs.constants.R_OK);
        checks.checks.views = { status: 'ok' };
    } catch (err) {
        checks.checks.views = { status: 'error', error: err.message };
        checks.status = 'unhealthy';
    }

    // Public directory check
    const publicPath = path.join(__dirname, 'public');
    try {
        fs.accessSync(publicPath, fs.constants.R_OK);
        checks.checks.static = { status: 'ok' };
    } catch (err) {
        checks.checks.static = { status: 'error', error: err.message };
        checks.status = 'unhealthy';
    }

    // Determine HTTP status code
    const httpStatus = checks.status === 'unhealthy' ? 503 : 200;

    res.status(httpStatus).json(checks);
})

// 404 handler - must be last route
app.use((req, res) => {
    res.status(404).render('pages/404.ejs', { layout: 'layouts/default.ejs' })
})

module.exports = app;