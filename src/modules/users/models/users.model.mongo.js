const mongoose = require('mongoose');

// Define the users schema
const usersSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false }, // select: false means the password is not returned in the response
  bio: { type: String, required: false },
  // TODO: Add profile picture
  // profilePicture: { type: String, required: false },
  // TODO: Add followers and following
  // followers: { type: Number, default: 0 },
  // following: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

function stripPassword(_doc, ret) {
  delete ret.password;
  return ret;
}

usersSchema.set('toJSON', { transform: stripPassword });
usersSchema.set('toObject', { transform: stripPassword });

// Create the users model
const UsersModel = mongoose.model('Users', usersSchema);

// Export the users model
module.exports = UsersModel;
