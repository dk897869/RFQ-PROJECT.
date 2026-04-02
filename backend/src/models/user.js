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
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["Admin", "Manager", "VP", "User", "Approver"],
    default: "Manager"
  },
  // Mobile/Contact Information (both fields for compatibility)
  contactNo: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  // Professional Information
  department: {
    type: String,
    trim: true,
    default: 'Purchase'
  },
  designation: {
    type: String,
    trim: true,
    default: ''
  },
  organization: {
    type: String,
    trim: true,
    default: 'Radiant Appliances'
  },
  // Account Status
  lastLogin: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Module Rights/Permissions
  rights: {
    epApproval: { type: Boolean, default: false },
    vendors: { type: Boolean, default: false },
    parts: { type: Boolean, default: false },
    rfq: { type: Boolean, default: false },
    userManagement: { type: Boolean, default: false },
    nppProcurement: { type: Boolean, default: false },
    bidding: { type: Boolean, default: false },
    paymentRequest: { type: Boolean, default: false },
    dqms: { type: Boolean, default: false },
    npi: { type: Boolean, default: false },
    systemBom: { type: Boolean, default: false },
    bomForecast: { type: Boolean, default: false },
    priceApproval: { type: Boolean, default: false },
    planStock: { type: Boolean, default: false },
    supplierPerformance: { type: Boolean, default: false },
    vehicularMs: { type: Boolean, default: false }
  }
}, { 
  timestamps: true 
});

// Add getter to get phone number (prefer contactNo if available)
userSchema.virtual('mobile').get(function() {
  return this.contactNo || this.phone || '';
});

// Add indexes
userSchema.index({ contactNo: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });

module.exports = mongoose.model("User", userSchema);