const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema({
  // Basic Information
  name: { 
    type: String, 
    required: [true, "Vendor name is required"],
    trim: true,
    minlength: [2, "Vendor name must be at least 2 characters long"],
    maxlength: [100, "Vendor name cannot exceed 100 characters"]
  },
  email: { 
    type: String, 
    required: [true, "Email is required"],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email address"]
  },
  phone: { 
    type: String,
    required: [true, "Phone number is required"],
    trim: true,
    match: [/^[0-9+\-\s()]{10,15}$/, "Please enter a valid phone number"]
  },
  company: { 
    type: String,
    trim: true
  },

  // Address Information
  address: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  pincode: {
    type: String,
    trim: true,
    match: [/^[0-9]{6}$/, "Please enter a valid 6-digit pincode"]
  },

  // Tax & Business Information
  gst: { 
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Please enter a valid GST number (15 characters)"]
  },
  pan: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Please enter a valid PAN number"]
  },
  website: {
    type: String,
    trim: true
  },

  // Status
  status: { 
    type: String, 
    enum: {
      values: ["Active", "Inactive"],
      message: "Status must be either Active or Inactive"
    },
    default: "Active" 
  },

  // Additional Information
  paymentTerms: {
    type: String,
    enum: ["Net 30", "Net 60", "Net 90", "Cash on Delivery", "Advance Payment"],
    default: "Net 30"
  },
  bankName: {
    type: String,
    trim: true
  },
  accountNumber: {
    type: String,
    trim: true
  },
  ifscCode: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, "Please enter a valid IFSC code"]
  },

  // Contact Person
  contactPersonName: {
    type: String,
    trim: true
  },
  contactPersonDesignation: {
    type: String,
    trim: true
  },
  contactPersonPhone: {
    type: String,
    trim: true
  },
  contactPersonEmail: {
    type: String,
    trim: true,
    lowercase: true
  },

  // Metadata
  createdBy: {
    type: String,
    trim: true
  },
  lastUpdatedBy: {
    type: String,
    trim: true
  }

}, { 
  timestamps: true 
});

// Add indexes for better query performance
vendorSchema.index({ name: 1 });
vendorSchema.index({ email: 1 });
vendorSchema.index({ status: 1 });
vendorSchema.index({ gst: 1 });

// Virtual for full address
vendorSchema.virtual('fullAddress').get(function() {
  const parts = [this.address, this.city, this.state, this.country, this.pincode].filter(Boolean);
  return parts.join(', ');
});

// Pre-save middleware to clean up data
vendorSchema.pre('save', function(next) {
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  if (this.gst) {
    this.gst = this.gst.toUpperCase().trim();
  }
  if (this.pan) {
    this.pan = this.pan.toUpperCase().trim();
  }
  next();
});

module.exports = mongoose.model("Vendor", vendorSchema);