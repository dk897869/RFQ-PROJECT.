const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  name:String,
  email:String,
  phone:String,
  status:String
});

module.exports = mongoose.model("Vendor",schema);