const mongoose = require("mongoose");

const partSchema = new mongoose.Schema({
  partCode: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  location: String,
  quantity: { type: Number, default: 0 },
  category: String,
  status: { type: String, default: "Active" }
}, { timestamps: true });

module.exports = mongoose.model("Part", partSchema);