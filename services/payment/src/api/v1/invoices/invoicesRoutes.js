const express = require('express');
const router = express.Router();

const invoicesController = require('./invoicesController');
const { requireAuth, requireStudent } = require('../../../middleware/auth');
const { verifySecret } = require('../../../middleware/secretAuth');

// Student routes (JWT auth)
router.get('/my', requireAuth, requireStudent, invoicesController.listMyInvoices);
router.get('/:invoiceId', requireAuth, invoicesController.getInvoice);
router.put('/:invoiceId/paid', requireAuth, requireStudent, invoicesController.markAsPaid);

// Internal routes (service-to-service, secret auth)
router.post('/internal', verifySecret, invoicesController.createInvoice);
router.get('/internal/organization/:orgId', verifySecret, invoicesController.listByOrganization);

module.exports = router;
