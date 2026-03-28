const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  // Requester Information
  requester: {
    type: String,
    required: [true, "Requester name is required"],
    trim: true
  },
  department: {
    type: String,
    required: [true, "Department is required"],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"]
  },
  contactNo: {
    type: String,
    trim: true
  },
  organization: {
    type: String,
    trim: true
  },
  requestDate: {
    type: String,
    trim: true
  },

  // Activity Overview
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, "Amount is required"],
    min: [0, "Amount cannot be negative"]
  },
  vendor: {
    type: String,
    required: [true, "Vendor is required"],
    trim: true
  },

  // Purpose & Objective
  description: {
    type: String,
    trim: true
  },
  objective: {
    type: String,
    trim: true
  },

  // Priority & Status
  priority: {
    type: String,
    enum: {
      values: ["Low", "Medium", "High"],
      message: "Priority must be Low, Medium, or High"
    },
    default: "Medium"
  },
  status: {
    type: String,
    enum: {
      values: ["Pending", "Approved", "Rejected", "In-Process"],
      message: "Status must be Pending, Approved, Rejected, or In-Process"
    },
    default: "Pending"
  },

  // Approval Workflow
  approvedBy: {
    type: String,
    trim: true
  },
  approvedAt: {
    type: Date
  },
  approvalComments: {
    type: String,
    trim: true
  },
  rejectedBy: {
    type: String,
    trim: true
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },

  // Additional Fields
  remarks: {
    type: String,
    trim: true
  },
  stakeholderComment: {
    type: String,
    trim: true
  },
  cashFlowContext: {
    type: String,
    trim: true
  },

  // Attachments (stored as array of objects)
  attachments: [{
    name: String,
    fileSize: String,
    remark: String,
    fileUrl: String
  }],

  // Stakeholders (approval chain)
  stakeholders: [{
    name: String,
    designation: String,
    status: String,
    remarks: String,
    dateTime: String
  }],

  // CC List
  ccList: [{
    type: String,
    trim: true
  }]

}, { 
  timestamps: true 
});

// Add indexes for better query performance
requestSchema.index({ status: 1, createdAt: -1 });
requestSchema.index({ requester: 1 });
requestSchema.index({ department: 1 });
requestSchema.index({ priority: 1 });

// Virtual for formatted amount
requestSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-IN').format(this.amount);
});

// Pre-save middleware to set timestamps
requestSchema.pre('save', function(next) {
  if (!this.requestDate) {
    this.requestDate = new Date().toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: '2-digit' 
    }).replace(/\//g, '-');
  }
  next();
});

module.exports = mongoose.model("Request", requestSchema);