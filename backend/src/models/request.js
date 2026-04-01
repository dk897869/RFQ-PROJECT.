const mongoose = require('mongoose');

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
  remarks: { type: String, default: '' },
  dateTime: { type: Date, default: null },
  approvalOrder: { type: Number, required: true }
});

const requestSchema = new mongoose.Schema({
  requester: { type: String, required: true },
  department: { type: String, required: true },
  email: { type: String, required: true },
  contactNo: { type: String, default: '' },
  organization: { type: String, default: 'Radiant Appliances' },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  vendor: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium' 
  },
  description: { type: String, default: '' },
  objective: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected', 'In-Process', 'Completed'],
    default: 'Pending' 
  },
  stakeholders: [stakeholderSchema],
  ccList: [{ type: String }],
  requestDate: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Method to get current pending approver
requestSchema.methods.getCurrentApprover = function() {
  const pending = this.stakeholders.filter(s => s.status === 'Pending');
  if (pending.length > 0) {
    pending.sort((a, b) => a.approvalOrder - b.approvalOrder);
    return pending[0];
  }
  return null;
};

// Method to check if user can approve
requestSchema.methods.canUserApprove = function(userEmail) {
  const current = this.getCurrentApprover();
  return current && current.email === userEmail;
};

module.exports = mongoose.model('Request', requestSchema);