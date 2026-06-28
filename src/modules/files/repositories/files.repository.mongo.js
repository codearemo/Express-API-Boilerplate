// ******************************************************
// FILES REPOSITORY — MongoDB implementation
// ******************************************************

const FilesModel = require('../models/files.model.mongo');
const { withEntityId } = require('../../../utils/entity-id');

function normalize(doc) {
  return withEntityId(doc);
}

function toPlainObject(doc) {
  if (!doc) {
    return null;
  }

  return withEntityId(doc.toObject ? doc.toObject() : doc);
}

async function createMany(userId, files) {
  const docs = await FilesModel.insertMany(
    files.map((file) => ({
      userId,
      name: file.name,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      encoding: file.encoding,
      url: file.url,
      provider: file.provider,
      visibility: file.visibility,
      status: 'active',
    })),
  );

  return docs.map((doc) => toPlainObject(doc));
}

async function findActiveByNameAndUserId(name, userId) {
  const doc = await FilesModel.findOne({
    name,
    userId,
    status: 'active',
  }).lean();

  return normalize(doc);
}

async function findActiveByIdAndUserId(id, userId) {
  const doc = await FilesModel.findOne({
    _id: id,
    userId,
    status: 'active',
  }).lean();

  return normalize(doc);
}

async function findActiveById(id) {
  const doc = await FilesModel.findOne({
    _id: id,
    status: 'active',
  }).lean();

  return normalize(doc);
}

async function findActiveByName(name) {
  const doc = await FilesModel.findOne({
    name,
    status: 'active',
  }).lean();

  return normalize(doc);
}

async function markArchived(fileId, archivedName) {
  const doc = await FilesModel.findByIdAndUpdate(
    fileId,
    {
      status: 'archived',
      archivedName,
      archivedAt: new Date(),
      updatedAt: new Date(),
    },
    { returnDocument: 'after' },
  ).lean();

  return normalize(doc);
}

module.exports = {
  createMany,
  findActiveByNameAndUserId,
  findActiveByIdAndUserId,
  findActiveById,
  findActiveByName,
  markArchived,
};
