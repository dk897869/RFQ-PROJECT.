const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Check if the model already exists to prevent overwrite error
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Admin', 'Manager', 'User', 'Approver'],
    default: 'User'
  },
  designation: { type: String },
  department: { type: String },
  contactNo: { type: String },
  organization: { type: String, default: 'Radiant Appliances' },
  isActive: { type: Boolean, default: true },
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
  },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Check if model already exists to prevent OverwriteModelError
const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;