const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  otp: { 
    type: String, 
    required: true,
    minlength: 6,
    maxlength: 6
  },
  purpose: {
    type: String,
    enum: ['login', 'registration', 'password_reset'],
    default: 'login'
  },
  expiresAt: { 
    type: Date, 
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OTP", otpSchema);