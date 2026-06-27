// ******************************************************
// FILES SERVICE — validate uploads and delegate to storage driver
// ******************************************************

const { validateArchiveFile } = require('./files.validation');
const storage = require('./storage');

async function processUploadedFiles(files) {
  if (!files?.length) {
    const error = new Error('At least one file is required');
    error.statusCode = 400;
    throw error;
  }

  return storage.storeFiles(files);
}

async function archiveUploadedFile(body) {
  const { name } = validateArchiveFile(body);
  return storage.archiveFile(name);
}

module.exports = {
  processUploadedFiles,
  archiveUploadedFile,
};
