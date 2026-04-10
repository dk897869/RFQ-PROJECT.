const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  itemDescription: { type: String, required: true },
  uom: { type: String, default: 'Pcs' },
  quantity: { type: Number, required: true, min: 1 },
  make: String,
  alternativeSimilar: String,
  pictureExistingVendorReference: String,
  remark: String
});

const RFQSchema = new mongoose.Schema({
  requesterName: { type: String, default: 'Chandra Shekhar' },
  department: { type: String, default: 'Purchase' },
  emailId: { type: String, default: 'chandrashekhar@radiantappliances.com' },
  contactNo: { type: String, default: '8806668006' },
  requestDate: { type: Date, default: Date.now },
  organization: { type: String, default: 'Radaint' },
  titleOfActivity: { type: String, required: true },
  approvalFor: { type: String, default: 'Operational Support and Action plan' },
  priority: { type: String, enum: ['H', 'M', 'L'], default: 'H' },
  purposeAndObjective: String,
  items: [ItemSchema],
  ccTo: [{ type: String }],
  status: { 
    type: String, 
    enum: ['Open', 'In-Process', 'Approved', 'Rejected'], 
    default: 'In-Process' 
  }
}, { timestamps: true });

module.exports = mongoose.model('RFQ', RFQSchema);