const mongoose = require('mongoose');

const poItemSchema = new mongoose.Schema({
  partCode: { type: String },
  partDescription: { type: String },
  specification: { type: String },
  hsnCode: { type: String },
  instalment: { type: String },
  uom: { type: String },
  pcsCarton: { type: Number, default: 0 },
  qty: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 }
});

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

const termSchema = new mongoose.Schema({
  text: { type: String }
});

const financeRowSchema = new mongoose.Schema({
  text: { type: String }
});

const deliveryScheduleSchema = new mongoose.Schema({
  text: { type: String }
});

const poNppSchema = new mongoose.Schema({
  requesterName: { type: String },
  department: { type: String },
  emailId: { type: String },
  requestDate: { type: String },
  contactNo: { type: String },
  organization: { type: String, default: 'Radiant Appliances' },
  titleOfActivity: { type: String },
  purposeAndObjective: { type: String },
  amount: { type: Number, default: 0 },
  remarks: { type: String },
  priority: { type: String, enum: ['H', 'M', 'L'], default: 'M' },
  vendorCode: { type: String },
  vendorName: { type: String },
  vendorAddress: { type: String },
  vendorGst: { type: String },
  vendorContact: { type: String },
  vendorEmail: { type: String },
  vendorKindAttn: { type: String },
  orderNo: { type: String },
  orderDate: { type: String },
  quotRef: { type: String },
  prNo: { type: String },
  prDate: { type: String },
  purchaser: { type: String },
  purchaserMobile: { type: String },
  billingAddress: { type: String },
  billingGst: { type: String },
  shippingAddress: { type: String },
  shippingGst: { type: String },
  transporter: { type: String },
  taxes: { type: String },
  items: [poItemSchema],
  stakeholders: [stakeholderSchema],
  ccList: [{ type: String }],
  attachments: [attachmentSchema],
  terms: [termSchema],
  financeRows: [financeRowSchema],
  deliverySchedule: [deliveryScheduleSchema],
  source: { type: String, default: 'PO-NPP' },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'In-Process'], default: 'Pending' },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  rejectionComments: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('PoNpp', poNppSchema);