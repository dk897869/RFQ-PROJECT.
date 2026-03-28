const Part = require("../models/part");

// GET All Parts
exports.getParts = async (req, res) => {
  try {
    const parts = await Part.find().sort({ createdAt: -1 });
    res.json({ 
      success: true, 
      data: parts,
      count: parts.length 
    });
  } catch (err) {
    console.error("Get Parts Error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// GET Single Part by ID
exports.getPartById = async (req, res) => {
  try {
    const part = await Part.findById(req.params.id);
    if (!part) {
      return res.status(404).json({ 
        success: false, 
        message: "Part not found" 
      });
    }
    res.json({ success: true, data: part });
  } catch (err) {
    console.error("Get Part By ID Error:", err);
    
    if (err.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid part ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// CREATE Part
exports.addPart = async (req, res) => {
  try {
    const partData = {
      ...req.body,
      status: req.body.status || "Active",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const part = await Part.create(partData);
    res.status(201).json({ 
      success: true, 
      message: "Part added successfully", 
      data: part 
    });
  } catch (err) {
    console.error("Add Part Error:", err);
    res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// UPDATE Part
exports.updatePart = async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    const part = await Part.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!part) {
      return res.status(404).json({ 
        success: false, 
        message: "Part not found" 
      });
    }
    
    res.json({ 
      success: true, 
      message: "Part updated", 
      data: part 
    });
  } catch (err) {
    console.error("Update Part Error:", err);
    
    if (err.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid part ID format" 
      });
    }
    
    res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// Update Part Status
exports.updatePartStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const part = await Part.findByIdAndUpdate(
      id,
      { 
        status, 
        updatedAt: new Date() 
      },
      { new: true, runValidators: true }
    );
    
    if (!part) {
      return res.status(404).json({ 
        success: false, 
        message: "Part not found" 
      });
    }
    
    res.json({ 
      success: true, 
      message: "Part status updated", 
      data: part 
    });
  } catch (err) {
    console.error("Update Part Status Error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// DELETE Part
exports.deletePart = async (req, res) => {
  try {
    const part = await Part.findByIdAndDelete(req.params.id);
    if (!part) {
      return res.status(404).json({ 
        success: false, 
        message: "Part not found" 
      });
    }
    res.json({ 
      success: true, 
      message: "Part deleted" 
    });
  } catch (err) {
    console.error("Delete Part Error:", err);
    
    if (err.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid part ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};