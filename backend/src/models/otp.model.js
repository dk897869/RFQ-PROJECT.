const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, lowercase: true, sparse: true },
  mobile: { type: String, sparse: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ['login', 'registration', 'reset'], required: true },
  referenceSid: { type: String },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Auto delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Check if model already exists
const OTP = mongoose.models.OTP || mongoose.model('OTP', otpSchema);

module.exports = OTP;