const mongoose = require("mongoose");

const stakeholderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  designation: { type: String, required: true },
  line: { type: String, enum: ['Parallel', 'Sequential'], default: 'Sequential' },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending' 
  },
  remarks: { type: String },
  dateTime: { type: Date, default: Date.now },
  approvedBy: { type: String },
  approvalOrder: { type: Number, required: true },
  notificationSent: { type: Boolean, default: false },
  viewedAt: { type: Date }
});

const attachmentSchema = new mongoose.Schema({
  serialNo: { type: Number },
  name: { type: String },
  fileSize: { type: String },
  remark: { type: String },
  fileUrl: { type: String }
});

const requestSchema = new mongoose.Schema({
  // Requester Information
  requester: { type: String, required: true },
  department: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  contactNo: { type: String },
  organization: { type: String },
  requestDate: { type: String },
  
  // Activity Overview
  title: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  vendor: { type: String, required: true },
  
  // Purpose & Objective
  description: { type: String },
  objective: { type: String },
  
  // Priority & Status
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium' 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected', 'In-Process', 'Completed'],
    default: 'Pending' 
  },
  
  // Approval Workflow
  stakeholders: [stakeholderSchema],
  currentApproverIndex: { type: Number, default: 0 },
  
  // Attachments
  attachments: [attachmentSchema],
  
  // CC List
  ccList: [{ type: String, lowercase: true }],
  
  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: { type: String },
  approvedBy: { type: String },
  approvedAt: { type: Date },
  approvalComments: { type: String },
  rejectedBy: { type: String },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },
  completionDate: { type: Date }
  
}, { timestamps: true });

// Indexes for better performance
requestSchema.index({ status: 1, createdAt: -1 });
requestSchema.index({ requester: 1 });
requestSchema.index({ department: 1 });
requestSchema.index({ 'stakeholders.email': 1 });

// Virtual for formatted amount
requestSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-IN').format(this.amount);
});

// Method to get current pending approver
requestSchema.methods.getCurrentApprover = function() {
  if (!this.stakeholders || this.stakeholders.length === 0) return null;
  const pendingApprovers = this.stakeholders.filter(s => s.status === 'Pending');
  if (pendingApprovers.length > 0) {
    pendingApprovers.sort((a, b) => (a.approvalOrder || 0) - (b.approvalOrder || 0));
    return pendingApprovers[0];
  }
  return null;
};

// Method to check if user can approve
requestSchema.methods.canUserApprove = function(userEmail) {
  if (!userEmail || !this.stakeholders || this.stakeholders.length === 0) return false;
  const currentApprover = this.getCurrentApprover();
  return currentApprover && currentApprover.email === userEmail;
};

// Method to check if all approvals are complete
requestSchema.methods.isFullyApproved = function() {
  if (!this.stakeholders || this.stakeholders.length === 0) return false;
  return this.stakeholders.every(s => s.status === 'Approved');
};

// Pre-save middleware
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