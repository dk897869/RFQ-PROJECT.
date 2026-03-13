const Rfq = require("../models/Rfq");

exports.create = async(req,res)=>{
  const rfq = await Rfq.create(req.body);
  res.json(rfq);
};

exports.getAll = async(req,res)=>{
  const rfqs = await Rfq.find().sort({createdAt:-1});
  res.json(rfqs);
};

exports.updateStatus = async(req,res)=>{
  const rfq = await Rfq.findByIdAndUpdate(
    req.params.id,
    {status:req.body.status},
    {new:true}
  );
  res.json(rfq);
};