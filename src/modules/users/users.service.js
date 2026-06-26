// ******************************************************
// USERS SERVICE — business rules (no HTTP, no Mongoose)
// ******************************************************

const usersRepository = require('./repositories');
const { toPublicUser } = require('./users.utils');

async function getLoggedInUserProfile(userId) {
  const user = await usersRepository.findById(userId);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return toPublicUser(user);
}

module.exports = {
  getLoggedInUserProfile,
};
