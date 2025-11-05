const express = require('express');
const ejsLayouts = require('express-ejs-layouts');
const path = require("node:path");

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(ejsLayouts)

app.get('/', (req, res) => {
    res.render('pages/home.ejs', { layout: 'layouts/default.ejs' })
})

module.exports = app;