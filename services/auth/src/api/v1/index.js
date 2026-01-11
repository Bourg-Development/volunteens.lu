const express = require('express');
const router = express.Router();

const authRoutes = require('./auth/authRoutes');
const sessionsRoutes = require('./sessions/sessionsRoutes');
const internalRoutes = require('./internal/internalRoutes');

router.use('/auth', authRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/internal', internalRoutes);

router.use((req, res) => {
    res.status(404).json({ success: false, code: 404, msg: "This resource couldn't be found" });
});


module.exports = router;
