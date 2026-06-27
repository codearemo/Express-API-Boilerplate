// ******************************************************
// AUTH SERVICE — sign-up, sign-in, tokens (no HTTP, no Mongoose)
// ******************************************************

const usersRepository = require('../users/repositories');
const { refreshTokens: refreshTokensRepository } = require('./repositories');
const { toPublicUser } = require('../users/users.utils');
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateRefreshToken,
  validateSocialLogin,
  isEmail,
} = require('./auth.validation');
const { signAccessToken } = require('./auth.token');
const { assertUserIsActive } = require('./auth.utils');
const {
  generatePasswordResetToken,
  buildResetUrl,
  hashPasswordResetToken,
} = require('../../utils/password-reset');
const { sendPasswordResetEmail } = require('../../utils/mail');
const { mapMongoDuplicateKeyError } = require('../../utils/mongo-errors');
const { verifySocialToken } = require('../../utils/social-auth');
const { generateSocialUsername } = require('../../utils/social-username');
const config = require('../../config');
const bcrypt = require('bcrypt');

const FORGOT_PASSWORD_MESSAGE =
  'If that email is registered, a password reset link has been sent.';

async function issueAuthTokens(user) {
  const refreshToken = await refreshTokensRepository.createForUser(user._id);

  try {
    return {
      token: signAccessToken(user),
      refreshToken,
    };
  } catch (error) {
    await refreshTokensRepository.revokeByRawToken(refreshToken);
    throw error;
  }
}

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

  let user;

  try {
    user = await usersRepository.create({
      ...payload,
      password: await bcrypt.hash(payload.password, 10),
    });
  } catch (error) {
    throw mapMongoDuplicateKeyError(error);
  }

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

  if (!user.password) {
    const error = new Error('This account uses social login');
    error.statusCode = 400;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    const error = new Error('Invalid credentials');
    error.statusCode = 400;
    throw error;
  }

  assertUserIsActive(user);

  const tokens = await issueAuthTokens(user);

  return {
    user: toPublicUser(user),
    ...tokens,
  };
}

async function refresh(body) {
  const { refreshToken } = validateRefreshToken(body);
  const storedToken =
    await refreshTokensRepository.consumeValidByRawToken(refreshToken);

  if (!storedToken) {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  const user = await usersRepository.findById(storedToken.userId);

  if (!user) {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  assertUserIsActive(user);

  return issueAuthTokens(user);
}

async function logout(body) {
  const { refreshToken } = validateRefreshToken(body);
  await refreshTokensRepository.revokeByRawToken(refreshToken);
}

async function createSocialUser(profile) {
  let username = generateSocialUsername();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const taken = await usersRepository.findByUsername(username);

    if (!taken) {
      break;
    }

    username = generateSocialUsername();
  }

  try {
    return await usersRepository.create({
      firstName: profile.firstName,
      lastName: profile.lastName || 'User',
      email: profile.email,
      username,
      authProviders: [
        { provider: profile.provider, providerId: profile.providerId },
      ],
    });
  } catch (error) {
    throw mapMongoDuplicateKeyError(error);
  }
}

async function socialLogin(body) {
  const { provider, idToken } = validateSocialLogin(body);
  const profile = await verifySocialToken(provider, idToken);

  if (!profile.email) {
    const error = new Error('Email is required from the social provider');
    error.statusCode = 400;
    throw error;
  }

  let user = await usersRepository.findByAuthProvider(
    profile.provider,
    profile.providerId,
  );

  if (!user) {
    const existingByEmail = await usersRepository.findByEmail(profile.email);

    if (existingByEmail) {
      await usersRepository.addAuthProvider(
        existingByEmail._id,
        profile.provider,
        profile.providerId,
      );
      user = await usersRepository.findById(existingByEmail._id);
    } else {
      user = await createSocialUser(profile);
    }
  }

  assertUserIsActive(user);

  const tokens = await issueAuthTokens(user);

  return {
    user: toPublicUser(user),
    ...tokens,
  };
}

async function forgotPassword(body) {
  const { email, resetUrl } = validateForgotPassword(body);

  const user = await usersRepository.findByEmail(email);

  if (user) {
    const rawToken = generatePasswordResetToken();
    const hashedToken = hashPasswordResetToken(rawToken);
    const expiresAt = new Date(
      Date.now() + config.passwordResetExpiresMinutes * 60 * 1000,
    );

    await usersRepository.setPasswordResetToken(
      user._id,
      hashedToken,
      expiresAt,
    );

    const resetLink = buildResetUrl(resetUrl, rawToken);

    try {
      await sendPasswordResetEmail({ to: email, resetLink });
    } catch (error) {
      console.error(
        '[auth] Failed to send password reset email:',
        error.message,
      );
    }
  }

  return { message: FORGOT_PASSWORD_MESSAGE };
}

async function resetPassword(body) {
  const { token, password } = validateResetPassword(body);

  const user = await usersRepository.findByValidPasswordResetToken(token);

  if (!user) {
    const error = new Error('Invalid or expired reset token');
    error.statusCode = 400;
    throw error;
  }

  await usersRepository.updatePasswordAndClearResetToken(
    user._id,
    await bcrypt.hash(password, 10),
  );

  await refreshTokensRepository.revokeAllForUser(user._id);
}

module.exports = {
  register,
  login,
  socialLogin,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
};
