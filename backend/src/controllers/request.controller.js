const mongoose = require("mongoose");
const Request = require("../models/request");

// GET All EP Requests
exports.getRequests = async (req, res) => {
  try {
    const requests = await Request.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: requests,
      count: requests.length
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
    // Validate required fields
    const { requester, department, title, amount, vendor } = req.body;
    
    if (!requester) {
      return res.status(400).json({
        success: false,
        message: "Requester name is required"
      });
    }
    
    if (!department) {
      return res.status(400).json({
        success: false,
        message: "Department is required"
      });
    }
    
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required"
      });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required"
      });
    }
    
    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required"
      });
    }
    
    const requestData = {
      ...req.body,
      status: req.body.status || "Pending",
      requestDate: req.body.requestDate || new Date().toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: '2-digit' 
      }).replace(/\//g, '-'),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const newRequest = await Request.create(requestData);
    res.status(201).json({
      success: true,
      message: "EP Request created successfully",
      data: newRequest
    });
  } catch (error) {
    console.error("Create Request Error:", error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate entry found"
      });
    }
    
    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", ")
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create request"
    });
  }
};

// GET Single Request by ID
exports.getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid request ID format. ID must be a valid MongoDB ObjectId." 
      });
    }
    
    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        message: "Request not found" 
      });
    }
    res.json({ success: true, data: request });
  } catch (error) {
    console.error("Get Request By ID Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

// UPDATE Request
exports.updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid request ID format. ID must be a valid MongoDB ObjectId." 
      });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    const updated = await Request.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!updated) {
      return res.status(404).json({ 
        success: false, 
        message: "Request not found" 
      });
    }
    
    res.json({ 
      success: true, 
      message: "Request updated successfully", 
      data: updated 
    });
  } catch (error) {
    console.error("Update Request Error:", error);
    
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        success: false, 
        message: messages.join(", ") 
      });
    }
    
    res.status(400).json({ 
      success: false, 
      message: error.message || "Failed to update request"
    });
  }
};

// Approve Request
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments, approvedBy } = req.body;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid request ID format" 
      });
    }
    
    const approvedRequest = await Request.findByIdAndUpdate(
      id,
      {
        status: "Approved",
        approvedAt: new Date(),
        approvedBy: approvedBy || req.user?.name || "System",
        approvalComments: comments || "",
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!approvedRequest) {
      return res.status(404).json({ 
        success: false, 
        message: "Request not found" 
      });
    }
    
    res.json({
      success: true,
      message: "Request approved successfully",
      data: approvedRequest
    });
  } catch (error) {
    console.error("Approve Request Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to approve request" 
    });
  }
};

// Reject Request
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments, rejectedBy } = req.body;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid request ID format" 
      });
    }
    
    const rejectedRequest = await Request.findByIdAndUpdate(
      id,
      {
        status: "Rejected",
        rejectedAt: new Date(),
        rejectedBy: rejectedBy || req.user?.name || "System",
        rejectionReason: comments || "",
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!rejectedRequest) {
      return res.status(404).json({ 
        success: false, 
        message: "Request not found" 
      });
    }
    
    res.json({
      success: true,
      message: "Request rejected successfully",
      data: rejectedRequest
    });
  } catch (error) {
    console.error("Reject Request Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to reject request" 
    });
  }
};

// DELETE Request
exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid request ID format. ID must be a valid MongoDB ObjectId." 
      });
    }
    
    const request = await Request.findByIdAndDelete(id);
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        message: "Request not found" 
      });
    }
    res.json({ 
      success: true, 
      message: "Request deleted successfully" 
    });
  } catch (error) {
    console.error("Delete Request Error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to delete request"
    });
  }
};

// Get Requests by Status
exports.getRequestsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const requests = await Request.find({ status }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    console.error("Get Requests By Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch requests by status"
    });
  }
};

// Get Requests by Department
exports.getRequestsByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const requests = await Request.find({ department }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    console.error("Get Requests By Department Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch requests by department"
    });
  }
};

// Get Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalRequests = await Request.countDocuments();
    const pendingRequests = await Request.countDocuments({ status: "Pending" });
    const approvedRequests = await Request.countDocuments({ status: "Approved" });
    const rejectedRequests = await Request.countDocuments({ status: "Rejected" });
    const inProcessRequests = await Request.countDocuments({ status: "In-Process" });
    
    const totalAmount = await Request.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    
    res.json({
      success: true,
      data: {
        totalRequests,
        pending: pendingRequests,
        approved: approvedRequests,
        rejected: rejectedRequests,
        inProcess: inProcessRequests,
        totalAmount: totalAmount[0]?.total || 0,
        successRate: totalRequests > 0 ? ((approvedRequests / totalRequests) * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error("Get Dashboard Stats Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats"
    });
  }
};