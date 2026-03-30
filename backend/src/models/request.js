const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  requester: { type: String, required: true },
  department: { type: String, required: true },
  email: { type: String, required: true },
  contactNo: { type: String },
  organization: { type: String },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  vendor: { type: String, required: true },
  priority: { type: String, default: "Medium" },
  description: { type: String },
  objective: { type: String },
  status: { 
    type: String, 
    enum: ["Pending", "Approved", "Rejected", "In-Process"],
    default: "Pending"
  },
  stakeholders: [{
    name: String,
    email: String,
    designation: String,
    line: String,
    status: String,
    remarks: String,
    approvalOrder: Number
  }],
  ccList: [String],
  requestDate: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdByName: String,
  approvedBy: String,
  approvedAt: Date,
  rejectedBy: String,
  rejectedAt: Date,
  rejectionReason: String,
  approvalComments: String
}, { timestamps: true });

module.exports = mongoose.model("Request", requestSchema);