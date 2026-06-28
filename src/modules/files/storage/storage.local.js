// ******************************************************
// STORAGE — local disk driver
// ******************************************************

const fs = require('fs');
const path = require('path');
const config = require('../../../config');
const { buildArchiveKey } = require('../../../utils/upload-archive');
const { buildFileMetadata } = require('../../../utils/upload-metadata');

function ensureArchiveDirectory() {
  fs.mkdirSync(config.upload.local.archiveDirectory, { recursive: true });
}

function getActiveDirectory(visibility) {
  return visibility === 'public'
    ? config.upload.local.publicDirectory
    : config.upload.local.privateDirectory;
}

function buildLocalFileUrl(visibility, filename) {
  const subpath = visibility === 'public' ? 'public' : 'private';
  return `${config.upload.local.baseUrl}/uploads/${subpath}/${filename}`;
}

async function storeFiles(files, visibility) {
  return files.map((file) =>
    buildFileMetadata({
      url: buildLocalFileUrl(visibility, file.filename),
      name: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      encoding: file.encoding,
      provider: 'local',
      visibility,
    }),
  );
}

async function removeFile({ name, visibility }) {
  const activePath = path.join(getActiveDirectory(visibility), name);

  if (fs.existsSync(activePath)) {
    fs.unlinkSync(activePath);
  }
}

async function archiveFile(name, visibility) {
  const archiveKey = buildArchiveKey(name, config.upload.archivePrefix);
  const activePath = path.join(getActiveDirectory(visibility), name);
  const archivePath = path.join(config.upload.local.archiveDirectory, name);

  if (!fs.existsSync(activePath)) {
    const error = new Error('File not found');
    error.statusCode = 404;
    throw error;
  }

  ensureArchiveDirectory();
  fs.renameSync(activePath, archivePath);

  return {
    name,
    archivedName: archiveKey,
    provider: 'local',
  };
}

async function restoreArchived({ name, visibility }) {
  const activePath = path.join(getActiveDirectory(visibility), name);
  const archivePath = path.join(config.upload.local.archiveDirectory, name);

  if (!fs.existsSync(archivePath)) {
    return;
  }

  fs.mkdirSync(path.dirname(activePath), { recursive: true });
  fs.renameSync(archivePath, activePath);
}

function openFile({ name, visibility }) {
  const filePath = path.join(getActiveDirectory(visibility), name);

  if (!fs.existsSync(filePath)) {
    const error = new Error('File not found');
    error.statusCode = 404;
    throw error;
  }

  return { path: filePath };
}

module.exports = {
  storeFiles,
  removeFile,
  archiveFile,
  restoreArchived,
  openFile,
};
