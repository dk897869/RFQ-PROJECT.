const RFQ = require('../models/Rfq');   // ← Fixed: Capital 'R' to match model filename

// Get all RFQs
const getAllRFQs = async (req, res) => {
  try {
    const rfqs = await RFQ.find().sort({ createdAt: -1 });
    res.status(200).json({ 
      success: true, 
      count: rfqs.length,
      data: rfqs 
    });
  } catch (err) {
    console.error("Error in getAllRFQs:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch RFQs",
      error: err.message 
    });
  }
};

// Create new RFQ
const createRFQ = async (req, res) => {
  try {
    // Basic validation
    if (!req.body.titleOfActivity || !req.body.items || req.body.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "titleOfActivity and at least one item are required"
      });
    }

    const newRFQ = new RFQ(req.body);
    const savedRFQ = await newRFQ.save();
    
    res.status(201).json({ 
      success: true, 
      message: "RFQ created successfully",
      data: savedRFQ 
    });
  } catch (err) {
    console.error("Error in createRFQ:", err);
    res.status(400).json({ 
      success: false, 
      message: err.message || "Failed to create RFQ"
    });
  }
};

// Get single RFQ by ID
const getRFQById = async (req, res) => {
  try {
    const rfq = await RFQ.findById(req.params.id);
    
    if (!rfq) {
      return res.status(404).json({ 
        success: false, 
        message: 'RFQ not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: rfq 
    });
  } catch (err) {
    console.error("Error in getRFQById:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch RFQ",
      error: err.message 
    });
  }
};

// Get Vendors
const getVendors = (req, res) => {
  res.status(200).json({
    success: true,
    data: [
      { id: '1', name: 'Steel Corp Ltd', email: 'contact@steelcorp.com' },
      { id: '2', name: 'ElectroMart', email: 'sales@electromart.com' },
      { id: '3', name: 'PackPro', email: 'info@packpro.com' },
      { id: '4', name: 'Radiant Suppliers', email: 'purchase@radiantappliances.com' }
    ]
  });
};

// Get Departments (Added - useful for your form)
const getDepartments = (req, res) => {
  res.status(200).json({
    success: true,
    departments: [
      'Purchase',
      'Production',
      'Quality',
      'Logistics',
      'Maintenance',
      'HR',
      'Stores'
    ]
  });
};

module.exports = {
  getAllRFQs,
  createRFQ,
  getRFQById,
  getVendors,
  getDepartments     // ← Added
};