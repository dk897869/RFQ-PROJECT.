const Vendor = require("../models/vendor");

// GET All Vendors
exports.getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.json({ 
      success: true, 
      data: vendors,
      count: vendors.length 
    });
  } catch (err) {
    console.error("Get Vendors Error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// GET Single Vendor by ID
exports.getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ 
        success: false, 
        message: "Vendor not found" 
      });
    }
    res.json({ success: true, data: vendor });
  } catch (err) {
    console.error("Get Vendor By ID Error:", err);
    
    if (err.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid vendor ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// CREATE Vendor
exports.addVendor = async (req, res) => {
  try {
    const vendorData = {
      ...req.body,
      status: req.body.status || "Active",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const vendor = await Vendor.create(vendorData);
    res.status(201).json({ 
      success: true, 
      message: "Vendor added", 
      data: vendor 
    });
  } catch (err) {
    console.error("Add Vendor Error:", err);
    res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// UPDATE Vendor
exports.updateVendor = async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!vendor) {
      return res.status(404).json({ 
        success: false, 
        message: "Vendor not found" 
      });
    }
    
    res.json({ 
      success: true, 
      message: "Vendor updated", 
      data: vendor 
    });
  } catch (err) {
    console.error("Update Vendor Error:", err);
    
    if (err.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid vendor ID format" 
      });
    }
    
    res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// Update Vendor Status
exports.updateVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const vendor = await Vendor.findByIdAndUpdate(
      id,
      { 
        status, 
        updatedAt: new Date() 
      },
      { new: true, runValidators: true }
    );
    
    if (!vendor) {
      return res.status(404).json({ 
        success: false, 
        message: "Vendor not found" 
      });
    }
    
    res.json({ 
      success: true, 
      message: "Vendor status updated", 
      data: vendor 
    });
  } catch (err) {
    console.error("Update Vendor Status Error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// DELETE Vendor
exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) {
      return res.status(404).json({ 
        success: false, 
        message: "Vendor not found" 
      });
    }
    res.json({ 
      success: true, 
      message: "Vendor deleted" 
    });
  } catch (err) {
    console.error("Delete Vendor Error:", err);
    
    if (err.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid vendor ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};