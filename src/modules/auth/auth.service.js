// ******************************************************
// AUTH SERVICE — sign-up, sign-in, tokens (no HTTP, no Mongoose)
// ******************************************************

const usersRepository = require('../users/repositories');
const { toPublicUser } = require('../users/users.utils');
const {
  validateRegister,
  validateLogin,
  isEmail,
} = require('./auth.validation');
const { signToken } = require('./auth.token');
const bcrypt = require('bcrypt');

async function register(body) {
  const payload = validateRegister(body);

  const existingByEmail = await usersRepository.findByEmail(payload.email);
  if (existingByEmail) {
    const error = new Error('Email already in use');
    error.statusCode = 409;
    throw error;
  }

  const existingByUsername = await usersRepository.findByUsername(
    payload.username,
  );
  if (existingByUsername) {
    const error = new Error('Username already in use');
    error.statusCode = 409;
    throw error;
  }

  const user = await usersRepository.create({
    ...payload,
    password: await bcrypt.hash(payload.password, 10),
  });

  return toPublicUser(user);
}

async function login(body) {
  const { identifier, password } = validateLogin(body);

  const user = isEmail(identifier)
    ? await usersRepository.findByEmailWithPassword(identifier)
    : await usersRepository.findByUsernameWithPassword(identifier);

  if (!user) {
    const error = new Error('Invalid credentials');
    error.statusCode = 400;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    const error = new Error('Invalid credentials');
    error.statusCode = 400;
    throw error;
  }

  const publicUser = toPublicUser(user);

  return {
    user: publicUser,
    token: signToken(user),
  };
}

module.exports = {
  register,
  login,
};
