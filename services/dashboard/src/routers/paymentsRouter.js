const express = require('express');
const router = express.Router();

const paymentsController = require('../controllers/paymentsController');
const { requireAuth, requireStudent, requireCompleteProfile } = require('../middleware/auth');

// All routes require auth and complete profile
router.use(requireAuth);
router.use(requireCompleteProfile);

// Student payment routes
router.get('/payments', requireStudent, paymentsController.studentPayments);
router.post('/payments/:invoiceId/received', requireStudent, paymentsController.markAsPaid);

module.exports = router;
