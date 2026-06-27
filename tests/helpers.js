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
const { sentOtps } = require('../src/utils/mail');
const { OTP_PURPOSES } = require('../src/constants/otp');

const API = '/api/v1';

function getLatestOtp(email, purpose) {
  const matches = sentOtps.filter(
    (entry) => entry.to === email && entry.purpose === purpose,
  );

  return matches.at(-1)?.otp;
}

async function verifyRegisteredUser(app, email = 'jane@example.com') {
  const otp = getLatestOtp(email, OTP_PURPOSES.VERIFY_EMAIL);

  if (!otp) {
    throw new Error(`No verification OTP found for ${email}`);
  }

  const response = await request(app)
    .post(`${API}/auth/verify-email`)
    .send({ email, otp });

  if (response.status !== 200) {
    throw new Error(
      `verify-email failed: ${response.status} ${response.body.message}`,
    );
  }

  return response.body.data;
}

/**
 * Register a user, verify email, and return a JWT for protected route tests.
 */
async function getAuthToken(app) {
  await request(app)
    .post(`${API}/auth/register`)
    .send(validRegisterPayload());

  await verifyRegisteredUser(app);

  const loginResponse = await request(app)
    .post(`${API}/auth/login`)
    .send({ identifier: 'jane', password: VALID_PASSWORD });

  return loginResponse.body.data.token;
}

module.exports = {
  validRegisterPayload,
  VALID_PASSWORD,
  VALID_NEW_PASSWORD,
  getLatestOtp,
  verifyRegisteredUser,
  getAuthToken,
};
