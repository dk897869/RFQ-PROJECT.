const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

  name: String,

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ["Admin", "Manager", "VP"],
    default: "Manager",
  },

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);