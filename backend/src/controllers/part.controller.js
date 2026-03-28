const Part = require("../models/part");

// GET All Parts
exports.getParts = async (req, res) => {
  try {
    const parts = await Part.find().sort({ createdAt: -1 });
    res.json({ success: true, data: parts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE Part
exports.addPart = async (req, res) => {
  try {
    const part = await Part.create(req.body);
    res.status(201).json({ success: true, message: "Part added successfully", data: part });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// UPDATE Part
exports.updatePart = async (req, res) => {
  try {
    const part = await Part.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!part) return res.status(404).json({ success: false, message: "Part not found" });
    res.json({ success: true, message: "Part updated", data: part });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE Part
exports.deletePart = async (req, res) => {
  try {
    const part = await Part.findByIdAndDelete(req.params.id);
    if (!part) return res.status(404).json({ success: false, message: "Part not found" });
    res.json({ success: true, message: "Part deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};