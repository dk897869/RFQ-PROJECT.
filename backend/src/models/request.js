const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  item:String,
  currentPrice:Number,
  newPrice:Number,
  variance:Number,
  status:{
    type:String,
    enum:["Pending","Approved","Rejected"],
    default:"Pending"
  }
},{timestamps:true});

module.exports = mongoose.model("Request",schema);