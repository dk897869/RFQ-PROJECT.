const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: [true, "Email is required"],
    lowercase: true,
    trim: true,
    index: true
  },
  otp: { 
    type: String, 
    required: [true, "OTP is required"],
    minlength: 6,
    maxlength: 6
  },
  expiresAt: { 
    type: Date, 
    required: true,
    index: { expires: 0 } // TTL index - automatically remove expired documents
  },
  attempts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

// Add compound index for faster lookups
otpSchema.index({ email: 1, otp: 1 });

// Method to check if OTP is expired
otpSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Static method to clean up expired OTPs
otpSchema.statics.cleanExpired = async function() {
  return await this.deleteMany({ expiresAt: { $lt: new Date() } });
};

module.exports = mongoose.model("OTP", otpSchema);