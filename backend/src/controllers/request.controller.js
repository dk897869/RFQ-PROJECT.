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
    const requestData = {
      ...req.body,
      status: req.body.status || "Pending",
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
    console.error("Get Request By ID Error:", error);
    
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid request ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

// UPDATE Request
exports.updateRequest = async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    const updated = await Request.findByIdAndUpdate(
      req.params.id, 
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
      message: "Request updated", 
      data: updated 
    });
  } catch (error) {
    console.error("Update Request Error:", error);
    
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid request ID format" 
      });
    }
    
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Approve Request
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    
    const approvedRequest = await Request.findByIdAndUpdate(
      id,
      {
        status: "Approved",
        approvedAt: new Date(),
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
    
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid request ID format" 
      });
    }
    
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
    const { comments } = req.body;
    
    const rejectedRequest = await Request.findByIdAndUpdate(
      id,
      {
        status: "Rejected",
        rejectedAt: new Date(),
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
    
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid request ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to reject request" 
    });
  }
};

// DELETE Request
exports.deleteRequest = async (req, res) => {
  try {
    const request = await Request.findByIdAndDelete(req.params.id);
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
    
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid request ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};