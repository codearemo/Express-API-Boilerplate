const filesService = require('./files.service');
const { sendSuccess } = require('../../utils/api-response');

async function uploadFiles(req, res, next) {
  try {
    const files = await filesService.processUploadedFiles(
      req.user.id,
      req.files,
    );

    sendSuccess(res, {
      statusCode: 201,
      message: 'Files uploaded successfully',
      data: files,
    });
  } catch (error) {
    next(error);
  }
}

async function archiveFile(req, res, next) {
  try {
    const archived = await filesService.archiveUploadedFile(
      req.user.id,
      req.params.fileId,
    );

    sendSuccess(res, {
      message: 'File archived successfully',
      data: archived,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadFiles,
  archiveFile,
};
