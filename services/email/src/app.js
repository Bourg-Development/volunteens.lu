require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');

const app = express();

const apiV1Router = require('./api/v1/emailRoutes');
const logger = require('./utils/logger');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'email' });
});

app.use('/api/v1', apiV1Router);

app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
});

module.exports = app;