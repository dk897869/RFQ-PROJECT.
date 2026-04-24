const PoNpp = require('../models/poNpp.model');

// Create PO NPP
exports.createPoNpp = async (req, res) => {
  try {
    console.log("📥 Received PO NPP data:", JSON.stringify(req.body, null, 2));
    
    const {
      vendorCode, vendorName, vendorAddress, vendorGst, vendorContact, vendorEmail, vendorKindAttn,
      orderNo, orderDate, quotRef, prNo, prDate, purchaser, purchaserMobile,
      billingAddress, billingGst, shippingAddress, shippingGst,
      titleOfActivity, purposeAndObjective, amount, remarks, priority,
      items, stakeholders, ccList, attachments, terms, financeRows, deliverySchedule, transporter, taxes,
      requesterName, department, emailId, requestDate, contactNo, organization,
      source, status
    } = req.body;

    const newPo = new PoNpp({
      requesterName,
      department,
      emailId,
      requestDate: requestDate || new Date().toISOString().split('T')[0],
      contactNo,
      organization: organization || 'Radiant Appliances',
      titleOfActivity,
      purposeAndObjective,
      amount: amount || 0,
      remarks,
      priority: priority || 'M',
      vendorCode, vendorName, vendorAddress, vendorGst, vendorContact, vendorEmail, vendorKindAttn,
      orderNo, orderDate, quotRef, prNo, prDate, purchaser, purchaserMobile,
      billingAddress, billingGst, shippingAddress, shippingGst,
      items: items || [],
      stakeholders: stakeholders || [],
      ccList: ccList || [],
      attachments: attachments || [],
      terms: terms || [],
      financeRows: financeRows || [],
      deliverySchedule: deliverySchedule || [],
      transporter,
      taxes,
      source: source || 'PO-NPP',
      status: status || 'Pending'
    });

    const savedPo = await newPo.save();
    console.log("✅ PO NPP saved successfully:", savedPo._id);

    res.status(201).json({
      success: true,
      message: 'PO NPP created successfully',
      data: savedPo
    });
  } catch (err) {
    console.error("❌ Error in createPoNpp:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all PO NPP
exports.listPoNpp = async (req, res) => {
  try {
    const rows = await PoNpp.find().sort({ createdAt: -1 });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single PO NPP by ID
exports.getPoNpp = async (req, res) => {
  try {
    const row = await PoNpp.findById(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "PO NPP not found" });
    }
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update PO NPP
exports.updatePoNpp = async (req, res) => {
  try {
    const updated = await PoNpp.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "PO NPP not found" });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete PO NPP
exports.deletePoNpp = async (req, res) => {
  try {
    const deleted = await PoNpp.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "PO NPP not found" });
    }
    res.json({ success: true, message: "PO NPP deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Approve PO NPP
exports.approvePoNpp = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    
    const po = await PoNpp.findById(id);
    if (!po) {
      return res.status(404).json({ success: false, message: "PO NPP not found" });
    }
    
    if (po.stakeholders && po.stakeholders.length > 0) {
      const pendingApprover = po.stakeholders.find(s => s.status === 'Pending');
      if (pendingApprover) {
        pendingApprover.status = 'Approved';
        pendingApprover.remarks = comments;
        pendingApprover.dateTime = new Date().toISOString();
      }
      
      const remainingPending = po.stakeholders.filter(s => s.status === 'Pending');
      po.status = remainingPending.length === 0 ? 'Approved' : 'In-Process';
    } else {
      po.status = 'Approved';
    }
    
    po.approvedAt = new Date();
    await po.save();
    
    res.json({ success: true, message: "PO NPP approved", data: po });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Reject PO NPP
exports.rejectPoNpp = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    
    const po = await PoNpp.findById(id);
    if (!po) {
      return res.status(404).json({ success: false, message: "PO NPP not found" });
    }
    
    if (po.stakeholders && po.stakeholders.length > 0) {
      const pendingApprover = po.stakeholders.find(s => s.status === 'Pending');
      if (pendingApprover) {
        pendingApprover.status = 'Rejected';
        pendingApprover.remarks = comments;
        pendingApprover.dateTime = new Date().toISOString();
      }
    }
    
    po.status = 'Rejected';
    po.rejectedAt = new Date();
    po.rejectionComments = comments;
    await po.save();
    
    res.json({ success: true, message: "PO NPP rejected", data: po });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};