const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  // Requester Information
  requester: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  contactNo: {
    type: String,
    trim: true
  },

  // Activity Overview
  title: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  vendor: {
    type: String,
    trim: true
  },

  // Purpose & Objective
  description: {
    type: String,
    trim: true
  },

  // Additional Fields
  priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium"
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected", "In-Process"],
    default: "Pending"
  },

  // For future use (Approval workflow, attachments, etc.)
  approvedBy: String,
  remarks: String

}, { 
  timestamps: true 
});

// Optional: Add index for better query performance
requestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Request", requestSchema);