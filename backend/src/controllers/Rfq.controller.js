const RFQ = require('../models/Rfq');
const { sendMail } = require('../services/mail.service');
const { buildRfqPdfBuffer } = require('../utils/rfqPdf');

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

// Create new RFQ - FIXED VERSION
const createRFQ = async (req, res) => {
  try {
    console.log("📥 Received RFQ data:", JSON.stringify(req.body, null, 2));

    // Extract data from request body (handle both formats)
    let { 
      titleOfActivity, 
      items, 
      requesterName,
      department,
      emailId,
      contactNo,
      requestDate,
      organization,
      approvalFor,
      priority,
      purposeAndObjective,
      ccTo
    } = req.body;

    // FIX: If items is empty or invalid, check for alternative field names
    if (!items || !Array.isArray(items) || items.length === 0) {
      // Try to extract items from form data (might be sent as stringified JSON)
      if (req.body.itemsJson) {
        try {
          items = JSON.parse(req.body.itemsJson);
        } catch (e) {
          console.error("Failed to parse itemsJson:", e);
        }
      }
      
      // Check for individual item fields (if sent as separate fields)
      if (!items && req.body.itemDescription) {
        items = [{
          itemDescription: req.body.itemDescription,
          uom: req.body.uom || 'Pcs',
          quantity: parseInt(req.body.quantity) || 1,
          make: req.body.make || '',
          alternativeSimilar: req.body.alternativeSimilar || '',
          pictureExistingVendorReference: req.body.pictureExistingVendorReference || '',
          remark: req.body.remark || ''
        }];
      }
    }

    // Enhanced validation with detailed error messages
    if (!titleOfActivity) {
      return res.status(400).json({
        success: false,
        message: "titleOfActivity is required",
        receivedData: req.body
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one item is required",
        receivedItems: items,
        receivedBody: req.body
      });
    }

    // Validate each item has required fields
    for (let i = 0; i < items.length; i++) {
      if (!items[i].itemDescription) {
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1} missing itemDescription`,
          item: items[i]
        });
      }
      if (!items[i].quantity || items[i].quantity < 1) {
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1} must have quantity >= 1`,
          item: items[i]
        });
      }
    }

    // Set default values if not provided
    const rfqData = {
      requesterName: requesterName || 'Chandra Shekhar',
      department: department || 'Purchase',
      emailId: emailId || 'chandrashekhar@radiantappliances.com',
      contactNo: contactNo || '8806668006',
      requestDate: requestDate || new Date(),
      organization: organization || 'Radaint',
      titleOfActivity: titleOfActivity,
      approvalFor: approvalFor || 'Operational Support and Action plan',
      priority: priority || 'H',
      purposeAndObjective: purposeAndObjective || '',
      items: items,
      ccTo: ccTo || [],
      status: 'In-Process'
    };

    const newRFQ = new RFQ(rfqData);
    const savedRFQ = await newRFQ.save();

    console.log("✅ RFQ saved successfully:", savedRFQ._id);

    // Send email notification (don't block response if fails)
    try {
      let pdf = null;
      try {
        if (buildRfqPdfBuffer) {
          pdf = await buildRfqPdfBuffer(savedRFQ);
        }
      } catch (e) {
        console.error('PDF generation error:', e.message);
      }
      
      const to = savedRFQ.emailId;
      if (to && sendMail) {
        const html = `
          <h2>Requisition RFQ (NPP)</h2>
          <p><strong>Title:</strong> ${savedRFQ.titleOfActivity || ''}</p>
          <p><strong>Priority:</strong> ${savedRFQ.priority || ''}</p>
          <p><strong>Department:</strong> ${savedRFQ.department || ''}</p>
          <p><strong>Request Date:</strong> ${savedRFQ.requestDate || new Date()}</p>
          <h3>Items:</h3>
          <table border="1" cellpadding="5">
            <tr><th>Description</th><th>UOM</th><th>Quantity</th><th>Make</th></tr>
            ${savedRFQ.items.map(item => `
              <tr>
                <td>${item.itemDescription}</td>
                <td>${item.uom}</td>
                <td>${item.quantity}</td>
                <td>${item.make || '-'}</td>
              </tr>
            `).join('')}
          </table>
        `;
        
        await sendMail({
          to,
          cc: savedRFQ.ccTo?.length ? savedRFQ.ccTo : undefined,
          subject: `RFQ (NPP): ${savedRFQ.titleOfActivity}`,
          html,
          text: savedRFQ.titleOfActivity,
          attachments: pdf ? [{ filename: 'RFQ-NPP.pdf', content: pdf, contentType: 'application/pdf' }] : [],
        });
        console.log("📧 Email sent successfully");
      }
    } catch (mailErr) {
      console.error('Email sending error:', mailErr.message);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'RFQ created successfully',
      data: savedRFQ,
    });
  } catch (err) {
    console.error("❌ Error in createRFQ:", err);
    res.status(400).json({ 
      success: false, 
      message: err.message || "Failed to create RFQ",
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
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

// Update RFQ
const updateRFQ = async (req, res) => {
  try {
    const rfq = await RFQ.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!rfq) {
      return res.status(404).json({ 
        success: false, 
        message: 'RFQ not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'RFQ updated successfully',
      data: rfq 
    });
  } catch (err) {
    console.error("Error in updateRFQ:", err);
    res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// Delete RFQ
const deleteRFQ = async (req, res) => {
  try {
    const rfq = await RFQ.findByIdAndDelete(req.params.id);
    
    if (!rfq) {
      return res.status(404).json({ 
        success: false, 
        message: 'RFQ not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'RFQ deleted successfully' 
    });
  } catch (err) {
    console.error("Error in deleteRFQ:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
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

// Get Departments
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
  updateRFQ,
  deleteRFQ,
  getVendors,
  getDepartments
};