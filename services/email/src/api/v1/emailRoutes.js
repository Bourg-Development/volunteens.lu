const express = require('express');
const router = express.Router();

const emailController = require('./emailController');
const secretMiddleware = require('../../middleware/secretAuth');

router.use(secretMiddleware.verifySecret);

router.post('/internal/send', emailController.send);

module.exports = router;