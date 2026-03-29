const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,  // This creates the index - remove any schema.index() calls
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["Admin", "Manager", "VP", "User"],
    default: "Manager"
  },
  phone: {
    type: String,
    trim: true
  },
  lastLogin: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true 
});

// Remove this line if you have it:
// userSchema.index({ email: 1 });

module.exports = mongoose.model("User", userSchema);