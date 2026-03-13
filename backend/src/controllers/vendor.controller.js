const Vendor = require("../models/vendor");

exports.create = async (req, res) => {
  const vendor = await Vendor.create(req.body);
  res.json(vendor);
};

exports.getAll = async (req, res) => {
  const vendors = await Vendor.find();
  res.json(vendors);
};

exports.delete = async (req, res) => {
  await Vendor.findByIdAndDelete(req.params.id);
  res.json({ message: "Vendor deleted" });
};