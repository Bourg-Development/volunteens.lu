const express = require('express');
const router = express.Router();

const indexController = require('../web/indexController');

router.get('/login', indexController.login);
router.get('/register', indexController.register);
router.get('/forgot-password', indexController.forgotPassword);
router.get('/reset-password', indexController.resetPassword);

router.get('/', indexController.index)

module.exports = router;