// ******************************************************
// UPLOAD METADATA — uniform file object returned by the API
// ******************************************************

/**
 * @param {object} params
 * @param {string} params.url
 * @param {string} params.name
 * @param {string} params.originalName
 * @param {string} params.mimeType
 * @param {number} params.size
 * @param {string} params.encoding
 * @param {string} [params.provider] - local | s3 | cloudinary
 * @param {'public' | 'private'} [params.visibility]
 */
function buildFileMetadata({
  url,
  name,
  originalName,
  mimeType,
  size,
  encoding,
  provider,
  visibility,
}) {
  const metadata = {
    url,
    name,
    originalName,
    mimeType,
    size,
    encoding,
  };

  if (provider) {
    metadata.provider = provider;
  }

  if (visibility) {
    metadata.visibility = visibility;
  }

  return metadata;
}

module.exports = {
  buildFileMetadata,
};
