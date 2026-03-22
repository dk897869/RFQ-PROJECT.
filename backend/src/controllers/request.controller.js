const Request = require("../models/request");

exports.getAll = async (req,res)=>{
  const data = await Request.find();
  res.json({success:true,data});
};

exports.create = async (req,res)=>{
  const data = await Request.create(req.body);
  res.json({success:true,data});
};

exports.update = async (req,res)=>{
  const data = await Request.findByIdAndUpdate(
    req.params.id,
    req.body,
    {new:true}
  );
  res.json({success:true,data});
};