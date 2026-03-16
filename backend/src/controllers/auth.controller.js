const User = require("../models/user");
const bcrypt = require("bcryptjs");


/* ================= REGISTER ================= */

exports.register = async (req, res) => {

  try {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success:false,
        message:"All fields required"
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success:false,
        message:"Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password,10);

    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    res.status(201).json({
      success:true,
      message:"User registered successfully"
    });

  }
  catch(error){

    res.status(500).json({
      success:false,
      message:"Server error"
    });

  }

};



/* ================= LOGIN ================= */

exports.login = async (req, res) => {

  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success:false,
        message:"Email and password required"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success:false,
        message:"Email is not registered"
      });
    }

    const match = await bcrypt.compare(password,user.password);

    if (!match) {
      return res.status(401).json({
        success:false,
        message:"Invalid password"
      });
    }

    res.status(200).json({
      success:true,
      message:"Login successful",
      user:{
        id:user._id,
        name:user.name,
        email:user.email
      }
    });

  }
  catch(error){

    res.status(500).json({
      success:false,
      message:"Server error"
    });

  }

};