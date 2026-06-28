// ******************************************************
// REQUIRE UPLOAD VISIBILITY — query param required before multer runs
// ******************************************************

const {
  validateUploadVisibility,
} = require('../modules/files/files.validation');

function requireUploadVisibility(req, _res, next) {
  try {
    req.uploadVisibility = validateUploadVisibility(req.query.visibility);
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = requireUploadVisibility;
