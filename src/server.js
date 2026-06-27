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

function validateEnv() {
  if (!config.JWT_SECRET) {
    throw new Error('JWT_SECRET is required. Set it in your .env file.');
  }

  if (config.uploadDriver === 's3') {
    const { bucket, accessKeyId, secretAccessKey } = config.s3;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'UPLOAD_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.',
      );
    }
  }

  if (config.uploadDriver === 'cloudinary') {
    const { cloudName, apiKey, apiSecret } = config.cloudinary;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'UPLOAD_DRIVER=cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      );
    }
  }
}

// Start the server
async function start() {
  validateEnv();

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
