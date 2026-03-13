const mongoose = require("mongoose");

const VendorSchema = new mongoose.Schema({
  name: String,
  email: String,
  company: String,
  phone: String,
  status: {
    type: String,
    default: "Active"
  }
}, { timestamps: true });

module.exports = mongoose.model("Vendor", VendorSchema);