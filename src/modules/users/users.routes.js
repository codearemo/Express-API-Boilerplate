const express = require('express');
const usersController = require('./users.controller');
const authenticate = require('../../middleware/authenticate.middleware');

const router = express.Router();

// JWT required — authenticate sets req.user from the Bearer token
router.get('/me', authenticate, usersController.getLoggedInUserProfile);

module.exports = router;
