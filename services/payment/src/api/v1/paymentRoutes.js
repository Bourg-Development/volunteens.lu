const express = require('express');
const router = express.Router();

const invoicesRoutes = require('./invoices/invoicesRoutes');

// Mount invoices routes
router.use('/invoices', invoicesRoutes);

// Health check
router.get('/health', (req, res) => {
    res.json({ success: true, status: 'healthy' });
});

module.exports = router;
