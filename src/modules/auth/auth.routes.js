const express = require('express');
const authController = require('./auth.controller');
const {
  registerLimiter,
  loginLimiter,
  socialLoginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
  refreshLimiter,
  logoutLimiter,
} = require('../../middleware/rate-limit.middleware');

const router = express.Router();

router.post('/register', registerLimiter, authController.register);

router.post('/verify-email', verifyEmailLimiter, authController.verifyEmail);

router.post(
  '/resend-verification',
  resendVerificationLimiter,
  authController.resendVerification,
);

router.post('/login', loginLimiter, authController.login);

router.post('/social', socialLoginLimiter, authController.socialLogin);

router.post('/refresh', refreshLimiter, authController.refresh);

router.post('/logout', logoutLimiter, authController.logout);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  authController.forgotPassword,
);

router.post(
  '/reset-password',
  resetPasswordLimiter,
  authController.resetPassword,
);

module.exports = router;
