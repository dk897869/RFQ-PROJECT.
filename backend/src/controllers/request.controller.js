const Request = require("../models/request");

// GET All EP Requests
exports.getRequests = async (req, res) => {
  try {
    const requests = await Request.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error("Get Requests Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch requests"
    });
  }
};

// CREATE New EP Request
exports.createRequest = async (req, res) => {
  try {
    const newRequest = await Request.create(req.body);
    res.status(201).json({
      success: true,
      message: "EP Request created successfully",
      data: newRequest
    });
  } catch (error) {
    console.error("Create Request Error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create request"
    });
  }
};

// GET Single Request by ID
exports.getRequestById = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE Request
exports.updateRequest = async (req, res) => {
  try {
    const updated = await Request.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    res.json({ success: true, message: "Request updated", data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE Request
exports.deleteRequest = async (req, res) => {
  try {
    const request = await Request.findByIdAndDelete(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    res.json({ success: true, message: "Request deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};