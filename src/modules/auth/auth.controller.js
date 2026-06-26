const authService = require('./auth.service');
const { sendSuccess } = require('../../utils/api-response');

async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    sendSuccess(res, {
      statusCode: 201,
      message: 'User registered successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    sendSuccess(res, {
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
};
