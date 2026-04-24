const mongoose = require('mongoose');

const stakeholderSchema = new mongoose.Schema({
  line: { type: String, enum: ['Parallel', 'Sequential'], default: 'Sequential' },
  managerName: { type: String },
  email: { type: String },
  designation: { type: String },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'In-Process'], default: 'Pending' },
  dateTime: { type: Date },
  remarks: { type: String }
});

const attachmentSchema = new mongoose.Schema({
  name: { type: String },
  fileSize: { type: String },
  remark: { type: String }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String },
  invoiceDate: { type: String },
  invoiceValue: { type: Number, default: 0 }
});

const paymentNppSchema = new mongoose.Schema({
  requesterName: { type: String, required: true },
  department: { type: String },
  emailId: { type: String },
  requestDate: { type: String },
  contactNo: { type: String },
  organization: { type: String, default: 'Radiant Appliances' },
  titleOfActivity: { type: String },
  purposeAndObjective: { type: String },
  vendor: { type: String },
  amount: { type: Number, default: 0 },
  remarks: { type: String },
  priority: { type: String, enum: ['H', 'M', 'L'], default: 'M' },
  designation: { type: String },
  paymentDueTo: { type: String },
  level: { type: String },
  paymentTo: { type: String },
  expenseType: { type: String },
  expenseAmount: { type: String },
  balanceForPayment: { type: String },
  deduction: { type: String },
  bankDetails: { type: String },
  sapName: { type: String },
  sapCode: { type: String },
  invoices: [invoiceSchema],
  stakeholders: [stakeholderSchema],
  ccList: [{ type: String }],
  attachments: [attachmentSchema],
  source: { type: String, default: 'PAYMENT-ADVISE-NPP' },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'In-Process'], default: 'Pending' },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  rejectionComments: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('PaymentNpp', paymentNppSchema);