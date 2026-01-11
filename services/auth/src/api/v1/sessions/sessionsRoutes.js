const express = require('express');
const router = express.Router();
const sessionsController = require('./sessionsController');

router.get('/', sessionsController.list);
router.delete('/:sessionId', sessionsController.revoke);
router.delete('/', sessionsController.revokeAll);

module.exports = router;
