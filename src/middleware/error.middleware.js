const { formatErrorResponse } = require('../utils/api-response');

function errorHandler(err, req, res, _next) {
  const { statusCode, body } = formatErrorResponse(err);
  res.status(statusCode).json(body);
}

module.exports = errorHandler;
