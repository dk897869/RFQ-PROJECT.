const mongoose = require("mongoose");

const partSchema = new mongoose.Schema({
  // Basic Information
  partCode: { 
    type: String, 
    required: [true, "Part code is required"],
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [3, "Part code must be at least 3 characters long"],
    maxlength: [50, "Part code cannot exceed 50 characters"]
  },
  partNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  description: { 
    type: String, 
    required: [true, "Description is required"],
    trim: true,
    minlength: [5, "Description must be at least 5 characters long"]
  },

  // Pricing & Inventory
  price: { 
    type: Number, 
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"],
    max: [999999999, "Price cannot exceed 999,999,999"]
  },
  quantity: { 
    type: Number, 
    default: 0,
    min: [0, "Quantity cannot be negative"]
  },
  unit: {
    type: String,
    enum: ["pcs", "kg", "liters", "meters", "units", "boxes", "sets"],
    default: "pcs"
  },

  // Location & Categorization
  location: { 
    type: String,
    trim: true
  },
  category: { 
    type: String,
    trim: true,
    enum: {
      values: [
        "Electrical", "Electronics", "Metal Parts", "Raw Materials", 
        "Plastic Parts", "Training Material", "Hardware", "Software",
        "Pneumatics", "Hydraulics", "Fasteners", "Tools", "Consumables"
      ],
      message: "Please select a valid category"
    }
  },
  subCategory: {
    type: String,
    trim: true
  },

  // Manufacturer & Supplier Information
  manufacturer: { 
    type: String,
    trim: true
  },
  manufacturerPartNumber: {
    type: String,
    trim: true
  },
  supplier: {
    type: String,
    trim: true
  },

  // Technical Specifications
  specifications: {
    type: Map,
    of: String
  },
  weight: {
    type: Number,
    min: 0
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ["mm", "cm", "m", "inches"],
      default: "mm"
    }
  },

  // Status
  status: { 
    type: String, 
    enum: {
      values: ["Active", "Inactive", "Discontinued", "On Hold"],
      message: "Status must be Active, Inactive, Discontinued, or On Hold"
    },
    default: "Active" 
  },

  // Stock Management
  reorderLevel: {
    type: Number,
    default: 10,
    min: 0
  },
  reorderQuantity: {
    type: Number,
    default: 50,
    min: 0
  },
  lastOrderDate: {
    type: Date
  },
  lastOrderQuantity: {
    type: Number,
    min: 0
  },

  // Metadata
  createdBy: {
    type: String,
    trim: true
  },
  lastUpdatedBy: {
    type: String,
    trim: true
  }

}, { 
  timestamps: true 
});

// Add indexes for better query performance
partSchema.index({ partCode: 1 });
partSchema.index({ category: 1 });
partSchema.index({ status: 1 });
partSchema.index({ price: 1 });
partSchema.index({ quantity: 1 });

// Virtual for low stock indicator
partSchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.reorderLevel;
});

// Virtual for stock status
partSchema.virtual('stockStatus').get(function() {
  if (this.quantity <= 0) return 'Out of Stock';
  if (this.quantity <= this.reorderLevel) return 'Low Stock';
  if (this.quantity <= this.reorderLevel * 2) return 'Medium Stock';
  return 'In Stock';
});

// Virtual for formatted price
partSchema.virtual('formattedPrice').get(function() {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(this.price);
});

// Pre-save middleware to clean up data
partSchema.pre('save', function(next) {
  if (this.partCode) {
    this.partCode = this.partCode.toUpperCase().trim();
  }
  if (this.partNumber) {
    this.partNumber = this.partNumber.toUpperCase().trim();
  }
  if (this.manufacturerPartNumber) {
    this.manufacturerPartNumber = this.manufacturerPartNumber.toUpperCase().trim();
  }
  next();
});

// Static method to find low stock parts
partSchema.statics.findLowStock = function() {
  return this.find({ 
    status: 'Active',
    $expr: { $lte: ['$quantity', '$reorderLevel'] }
  });
};

// Static method to get category summary
partSchema.statics.getCategorySummary = async function() {
  return this.aggregate([
    { $group: {
      _id: '$category',
      count: { $sum: 1 },
      totalValue: { $sum: { $multiply: ['$price', '$quantity'] } },
      averagePrice: { $avg: '$price' }
    }},
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model("Part", partSchema);