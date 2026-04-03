const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Check if model already exists to prevent overwrite error
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Admin', 'Manager', 'VP', 'User', 'Approver'],
    default: 'Manager'
  },
  contactNo: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  department: { type: String, trim: true, default: 'Purchase' },
  designation: { type: String, trim: true, default: '' },
  organization: { type: String, trim: true, default: 'Radiant Appliances' },
  dateOfBirth: { type: Date },
  lastLogin: { type: Date },
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
  }
}, { 
  timestamps: true 
});

// Virtual for age calculation
userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual to check if today is birthday
userSchema.virtual('isBirthdayToday').get(function() {
  if (!this.dateOfBirth) return false;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  return today.getMonth() === birthDate.getMonth() && 
         today.getDate() === birthDate.getDate();
});

// Virtual for formatted birthday
userSchema.virtual('birthdayFormatted').get(function() {
  if (!this.dateOfBirth) return null;
  const date = new Date(this.dateOfBirth);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
});

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

// Check if model already exists before creating
const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;