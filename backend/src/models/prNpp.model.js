const mongoose = require('mongoose');

const stakeholderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  designation: { type: String, required: true },
  line: { type: String, enum: ['Parallel', 'Sequential'], default: 'Sequential' },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'In-Process'],
    default: 'Pending',
  },
  remarks: { type: String, default: '' },
  dateTime: { type: Date, default: null },
  approvalOrder: { type: Number, required: true },
});

const prLineSchema = new mongoose.Schema({
  costCenter: { type: String, default: '' },
  supplierName: { type: String, default: '' },
  partCode: { type: String, default: '' },
  itemDescription: { type: String, default: '' },
  specification: { type: String, default: '' },
  uom: { type: String, default: 'Pcs' },
  qty: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  value: { type: Number, default: 0 },
});

const attachmentSchema = new mongoose.Schema({
  name: { type: String },
  fileSize: { type: String },
  remark: { type: String },
  fileUrl: { type: String },
});

const prNppSchema = new mongoose.Schema(
  {
    requester: { type: String, required: true },
    department: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    contactNo: { type: String, default: '' },
    organization: { type: String, default: 'Radiant Appliances' },
    requestDate: { type: String, default: '' },
    controlNo: { type: String, default: '' },
    registration: { type: String, default: 'Regular' },
    activityTitle: { type: String, required: true },
    priority: { type: String, enum: ['H', 'M', 'L', 'Low', 'Medium', 'High'], default: 'M' },
    lineItems: [prLineSchema],
    totalValue: { type: Number, default: 0 },
    stakeholders: [stakeholderSchema],
    attachments: [attachmentSchema],
    ccList: [{ type: String }],
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'In-Process'],
      default: 'In-Process',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.PrNpp || mongoose.model('PrNpp', prNppSchema);
