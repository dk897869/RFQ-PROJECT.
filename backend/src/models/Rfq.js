const mongoose = require("mongoose");

const RfqSchema = new mongoose.Schema({
  title: String,
  description: String,
  value: Number,
  status: {
    type: String,
    default: "Pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("Rfq", RfqSchema);