const router = require("express").Router();
const Part = require("../models/part");

router.get("/", async(req,res)=>{
  const data = await Part.find();
  res.json(data);
});

router.post("/", async(req,res)=>{
  const data = await Part.create(req.body);
  res.json(data);
});

module.exports = router;