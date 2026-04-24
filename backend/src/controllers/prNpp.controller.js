const PrNpp = require('../models/prNpp.model');

// Create PR NPP
exports.createPrNpp = async (req, res) => {
  try {
    console.log("📥 Received PR NPP data:", JSON.stringify(req.body, null, 2));
    
    const {
      requesterName, department, emailId, requestDate, contactNo, organization,
      titleOfActivity, purposeAndObjective, vendor, amount, remarks, priority,
      items, stakeholders, ccList, attachments,
      source, status
    } = req.body;

    const newPr = new PrNpp({
      requesterName,
      department,
      emailId,
      requestDate: requestDate || new Date().toISOString().split('T')[0],
      contactNo,
      organization: organization || 'Radiant Appliances',
      titleOfActivity,
      purposeAndObjective,
      vendor,
      amount: amount || 0,
      remarks,
      priority: priority || 'M',
      items: items || [],
      stakeholders: stakeholders || [],
      ccList: ccList || [],
      attachments: attachments || [],
      source: source || 'PR-REQUEST-NPP',
      status: status || 'Pending'
    });

    const savedPr = await newPr.save();
    console.log("✅ PR NPP saved successfully:", savedPr._id);

    res.status(201).json({
      success: true,
      message: 'PR NPP created successfully',
      data: savedPr
    });
  } catch (err) {
    console.error("❌ Error in createPrNpp:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all PR NPP
exports.listPrNpp = async (req, res) => {
  try {
    const rows = await PrNpp.find().sort({ createdAt: -1 });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single PR NPP by ID
exports.getPrNpp = async (req, res) => {
  try {
    const row = await PrNpp.findById(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "PR NPP not found" });
    }
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update PR NPP
exports.updatePrNpp = async (req, res) => {
  try {
    const updated = await PrNpp.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "PR NPP not found" });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete PR NPP
exports.deletePrNpp = async (req, res) => {
  try {
    const deleted = await PrNpp.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "PR NPP not found" });
    }
    res.json({ success: true, message: "PR NPP deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Approve PR NPP
exports.approvePrNpp = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    
    const pr = await PrNpp.findById(id);
    if (!pr) {
      return res.status(404).json({ success: false, message: "PR NPP not found" });
    }
    
    if (pr.stakeholders && pr.stakeholders.length > 0) {
      const pendingApprover = pr.stakeholders.find(s => s.status === 'Pending');
      if (pendingApprover) {
        pendingApprover.status = 'Approved';
        pendingApprover.remarks = comments;
        pendingApprover.dateTime = new Date().toISOString();
      }
      
      const remainingPending = pr.stakeholders.filter(s => s.status === 'Pending');
      pr.status = remainingPending.length === 0 ? 'Approved' : 'In-Process';
    } else {
      pr.status = 'Approved';
    }
    
    pr.approvedAt = new Date();
    await pr.save();
    
    res.json({ success: true, message: "PR NPP approved", data: pr });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Reject PR NPP
exports.rejectPrNpp = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    
    const pr = await PrNpp.findById(id);
    if (!pr) {
      return res.status(404).json({ success: false, message: "PR NPP not found" });
    }
    
    if (pr.stakeholders && pr.stakeholders.length > 0) {
      const pendingApprover = pr.stakeholders.find(s => s.status === 'Pending');
      if (pendingApprover) {
        pendingApprover.status = 'Rejected';
        pendingApprover.remarks = comments;
        pendingApprover.dateTime = new Date().toISOString();
      }
    }
    
    pr.status = 'Rejected';
    pr.rejectedAt = new Date();
    pr.rejectionComments = comments;
    await pr.save();
    
    res.json({ success: true, message: "PR NPP rejected", data: pr });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};