const express = require('express');
const router = express.Router();
const contentController = require('./contentController');

// Admin routes (already protected by requireAdmin in parent router)
router.get('/', contentController.listAll);
router.get('/:pageKey', contentController.getPage);
router.put('/:pageKey/:sectionKey', contentController.updateSection);
router.put('/:pageKey', contentController.bulkUpdate);

module.exports = router;
