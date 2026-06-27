// ******************************************************
// AUTH REPOSITORIES — driver switch (mongo today, SQL later)
// ******************************************************

const config = require('../../../config');

const refreshTokensRepositories = {
  mongo: require('./refresh-tokens.repository.mongo'),
};

const emailOtpsRepositories = {
  mongo: require('./email-otps.repository.mongo'),
};

const refreshTokensRepository = refreshTokensRepositories[config.dbDriver];
const emailOtpsRepository = emailOtpsRepositories[config.dbDriver];

if (!refreshTokensRepository) {
  throw new Error(
    `No refresh tokens repository for DB_DRIVER: "${config.dbDriver}"`,
  );
}

if (!emailOtpsRepository) {
  throw new Error(
    `No email OTPs repository for DB_DRIVER: "${config.dbDriver}"`,
  );
}

module.exports = {
  refreshTokens: refreshTokensRepository,
  emailOtps: emailOtpsRepository,
};
