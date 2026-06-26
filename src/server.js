// ******************************************************
// START THE SERVER
// ******************************************************

// Load environment variables
require('dotenv').config();

// Import the app and config
const app = require('./app');
const config = require('./config');

// Import the database connection
const { connect } = require('./database');

// Start the server
async function start() {
  // Connect to the database
  await connect();

  // Start the server
  app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });
}

// Start the server and handle errors
start().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
