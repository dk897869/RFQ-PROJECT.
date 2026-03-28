const Vendor = require("../models/vendor");

// GET All Vendors
exports.getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.json({ success: true, data: vendors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE Vendor
exports.addVendor = async (req, res) => {
  try {
    const vendor = await Vendor.create(req.body);
    res.status(201).json({ success: true, message: "Vendor added", data: vendor });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// UPDATE Vendor
exports.updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
    res.json({ success: true, message: "Vendor updated", data: vendor });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE Vendor
exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
    res.json({ success: true, message: "Vendor deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};