const express = require('express');
const router = express.Router();

const eventsRoutes = require('./events/eventsRoutes');
const signupsRoutes = require('./signups/signupsRoutes');

router.use('/events', eventsRoutes);
router.use('/signups', signupsRoutes);

module.exports = router;
