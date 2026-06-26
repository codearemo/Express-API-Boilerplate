// ******************************************************
// CONFIGURE THE SERVER
// ******************************************************

// Configure the server with the environment variables
const config = {
  port: Number(process.env.PORT) || 3000,
  dbDriver: process.env.DB_DRIVER || 'mongo',
  // Used to sign and verify JWTs (set a long random string in .env)
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/feed-app',
  },
  sql: {
    dialect: process.env.SQL_DIALECT || 'mysql',
    host: process.env.SQL_HOST || 'localhost',
    port: Number(process.env.SQL_PORT) || 3306,
    database: process.env.SQL_DATABASE || 'feed_app',
    user: process.env.SQL_USER || 'root',
    password: process.env.SQL_PASSWORD || '',
  },
};

module.exports = config;
