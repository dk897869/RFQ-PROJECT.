const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req,res)=>{
  const {name,email,password} = req.body;

  const hashed = await bcrypt.hash(password,10);

  const user = await User.create({
    name,email,password:hashed
  });

  res.json(user);
};

exports.login = async (req,res)=>{
  const {email,password} = req.body;

  const user = await User.findOne({email});
  if(!user) return res.status(400).json({msg:"User not found"});

  const valid = await bcrypt.compare(password,user.password);
  if(!valid) return res.status(400).json({msg:"Invalid password"});

  const token = jwt.sign(
    {id:user._id,role:user.role},
    process.env.JWT_SECRET,
    {expiresIn:"1d"}
  );

  res.json({token});
};