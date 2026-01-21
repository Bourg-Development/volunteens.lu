const express = require('express');
const ejsLayouts = require('express-ejs-layouts');
const path = require("node:path");
const fs = require('fs');
const markdownit = require('markdown-it');
const md = markdownit()

const app = express();
const startTime = Date.now();

// Service URLs for frontend
const EVENTS_URL = process.env.EVENTS_URL || 'http://localhost:3004';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:3002';
const DASH_URL = process.env.DASH_URL || 'http://localhost:3005';
const ADMIN_URL = process.env.ADMIN_INTERNAL_URL || 'http://localhost:3003';

// CMS content cache (5 minute TTL)
let cmsCache = { content: null, timestamp: 0 };
const CMS_CACHE_TTL = 5 * 60 * 1000;

async function fetchCmsContent() {
    const now = Date.now();
    if (cmsCache.content && (now - cmsCache.timestamp) < CMS_CACHE_TTL) {
        return cmsCache.content;
    }

    try {
        const response = await fetch(`${ADMIN_URL}/api/v1/public/content`);
        const data = await response.json();
        if (data.success) {
            cmsCache = { content: data.content, timestamp: now };
            return data.content;
        }
    } catch (err) {
        console.error('Failed to fetch CMS content:', err.message);
    }
    return cmsCache.content || {};
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/default.ejs')

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(ejsLayouts)

app.use((req, res, next) => {
    res.locals.eventsUrl = EVENTS_URL;
    res.locals.authUrl = AUTH_URL;
    res.locals.dashUrl = DASH_URL;
    next()
})

app.get('/', async (req, res) => {
    const cms = await fetchCmsContent();
    res.render('pages/home.ejs', { layout: 'layouts/default.ejs', cms: cms.home || {} })
})
app.get('/about-us', async (req, res) => {
    const cms = await fetchCmsContent();
    res.render('pages/about.ejs', { layout: 'layouts/default.ejs', cms: cms.about || {} })
})
app.get('/contact', (req, res) => {
    res.render('pages/contact.ejs', { layout: 'layouts/default.ejs' })
})
app.get('/events', async (req, res) => {
    const cms = await fetchCmsContent();
    res.render('pages/events.ejs', {
        layout: 'layouts/default.ejs',
        eventsUrl: EVENTS_URL,
        authUrl: AUTH_URL,
        dashUrl: DASH_URL,
        cms: cms.events || {}
    })
})
app.get('/docs/:tag', (req, res) => {
    if(!fs.existsSync(path.join(__dirname, 'views/blog/', req.params.tag + '.md'))){
        return res.status(404).render('pages/404.ejs', { layout: 'layouts/default.ejs' })
    }
    const file = fs.readFileSync(path.join(__dirname, 'views/blog', req.params.tag + '.md'), 'utf8');
    const result = md.render(file);

    res.render('pages/blog.ejs', {
        md: result,
        layout: 'layouts/blog.ejs',
        child: false,
        title: req.params.tag.split('-').map(el => `${el[0].toUpperCase()}${el.slice(1)}`).join(' '),
        currentPage: req.params.tag
    })
})
app.get('/docs/:cat/:tag', (req, res) => {

    if(!fs.existsSync(path.join(__dirname, 'views/blog/', req.params.cat, req.params.tag + '.md'))){
        return res.status(404).render('pages/404.ejs', { layout: 'layouts/default.ejs' })
    }
    const file = fs.readFileSync(path.join(__dirname, 'views/blog', req.params.cat, req.params.tag + '.md'), 'utf8');
    const otherChilds = fs.readdirSync(path.join(__dirname, 'views/blog', req.params.cat)).map(child => child.replace('.md', '').split('-').map(el => `${el[0].toUpperCase()}${el.slice(1)}`).join(' '));
    const result = md.render(file);

    res.render('pages/blog.ejs', {
        md: result,
        layout: 'layouts/blog.ejs',
        child: true,
        cat: req.params.cat,
        otherChilds: otherChilds,
        title: req.params.tag.split('-').map(el => `${el[0].toUpperCase()}${el.slice(1)}`).join(' '),
        currentPage: req.params.tag
    })
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