const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  partCode:String,
  description:String,
  price:Number,
  location:String
});

module.exports = mongoose.model("Part",schema);