// ******************************************************
// TEST HELPERS — reusable request payloads
// ******************************************************

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
    password: 'password123',
    ...overrides,
  };
}

module.exports = {
  validRegisterPayload,
};
