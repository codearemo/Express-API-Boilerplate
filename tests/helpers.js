// ******************************************************
// TEST HELPERS — reusable request payloads
// ******************************************************

/**
 * Passwords that satisfy register/reset validation rules.
 */
const VALID_PASSWORD = 'Password123!';
const VALID_NEW_PASSWORD = 'Newpassword123!';

/**
 * Returns a valid register body. Pass overrides to tweak individual fields
 * (e.g. validRegisterPayload({ email: 'other@example.com' })).
 */
function validRegisterPayload(overrides = {}) {
  return {
    firstName: 'Jane',
    lastName: 'Doe',
    username: 'jane',
    email: 'jane@example.com',
    password: VALID_PASSWORD,
    ...overrides,
  };
}

const request = require('supertest');

const API = '/api/v1';

/**
 * Register a user and return a JWT for protected route tests.
 */
async function getAuthToken(app) {
  await request(app)
    .post(`${API}/auth/register`)
    .send(validRegisterPayload());

  const loginResponse = await request(app)
    .post(`${API}/auth/login`)
    .send({ identifier: 'jane', password: VALID_PASSWORD });

  return loginResponse.body.data.token;
}

module.exports = {
  validRegisterPayload,
  VALID_PASSWORD,
  VALID_NEW_PASSWORD,
  getAuthToken,
};
