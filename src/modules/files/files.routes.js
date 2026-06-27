const express = require('express');
const authenticate = require('../../middleware/authenticate.middleware');
const { uploadLimiter } = require('../../middleware/rate-limit.middleware');
const {
  uploadFiles: uploadFilesMiddleware,
} = require('../../middleware/upload.middleware');
const filesController = require('./files.controller');

const router = express.Router();

router.post(
  '/',
  authenticate,
  uploadLimiter,
  uploadFilesMiddleware,
  filesController.uploadFiles,
);

router.post('/archive', authenticate, filesController.archiveFile);

module.exports = router;
