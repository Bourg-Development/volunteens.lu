const express = require('express');
const ejsLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const path = require('path');
const pinoHttp = require('pino-http');

const app = express();

const apiV1Router = require('./api/v1');
const indexRouter = require('./routers/indexRouter');
const logger = require('./utils/logger');

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/default');

app.use(ejsLayouts);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));
app.use('/static', express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/v1', apiV1Router);

// Web routes
app.use('/', indexRouter);

app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
});

module.exports = app;
