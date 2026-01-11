const express = require('express');
const ejsLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const path = require("node:path");
const pinoHttp = require('pino-http');

const app = express();

const indexRouter = require('./routers/indexRouter');
const eventsRouter = require('./routers/eventsRouter');
const paymentsRouter = require('./routers/paymentsRouter');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/default.ejs')

const logger = require('./utils/logger');

app.use(ejsLayouts);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));
app.use('/static', express.static(path.join(__dirname, 'public')));

const { isProduction } = require('./config/environment');
app.use((req, res, next) => {
    res.locals.authUrl = process.env.AUTH_URL;
    res.locals.isProduction = isProduction;
    next()
})

app.use('/', indexRouter);
app.use('/', eventsRouter);
app.use('/', paymentsRouter);

app.use((req, res) => {
    res.status(404).render("pages/error.ejs", { error: '404', msg: 'This resource could not be found.' });
});

module.exports = app;