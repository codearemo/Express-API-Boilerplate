// ******************************************************
// FILES UTILS — API shapes for stored file records
// ******************************************************

function toPublicFile(record) {
  return {
    id: String(record._id),
    url: record.url,
    name: record.name,
    originalName: record.originalName,
    mimeType: record.mimeType,
    size: record.size,
    encoding: record.encoding,
    provider: record.provider,
  };
}

function toArchivedFile(record, archived) {
  return {
    id: String(record._id),
    name: archived.name,
    archivedName: archived.archivedName,
    provider: archived.provider,
  };
}

module.exports = {
  toPublicFile,
  toArchivedFile,
};
