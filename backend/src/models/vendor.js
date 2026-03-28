const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  company: String,
  gst: String,
  status: { type: String, default: "Active" }
}, { timestamps: true });

module.exports = mongoose.model("Vendor", vendorSchema);