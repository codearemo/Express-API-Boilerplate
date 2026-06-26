// ******************************************************
// AUTHENTICATE MIDDLEWARE — protect routes with JWT
// ******************************************************

const { verifyToken } = require('../modules/auth/auth.token');

/**
 * Express middleware that requires a valid JWT.
 *
 * Expects: Authorization: Bearer <token>
 *
 * On success: sets req.user = { id: '<mongo user id>' } and calls next().
 * On failure: passes a 401 error to the global error handler.
 */
function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;

  // No header or wrong scheme (must be "Bearer <token>")
  if (!authHeader?.startsWith('Bearer ')) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    next(error);
    return;
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const payload = verifyToken(token);
    // `sub` from JWT → available to controllers as req.user.id
    req.user = { id: payload.sub };
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;
