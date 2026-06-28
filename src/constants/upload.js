// ******************************************************
// UPLOAD CONSTANTS
// ******************************************************

const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

const PROFILE_PICTURE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const UPLOAD_FIELD_NAME = 'files';

const FILE_VISIBILITIES = ['public', 'private'];

module.exports = {
  DEFAULT_ALLOWED_MIME_TYPES,
  PROFILE_PICTURE_MIME_TYPES,
  UPLOAD_FIELD_NAME,
  FILE_VISIBILITIES,
};
