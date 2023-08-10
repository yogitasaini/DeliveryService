const asyncHandler = require("express-async-handler");
const generateToken = require("../utils/generateToken.js");
const User = require("../models/userModel.js");
//const sharp = require("sharp");
//const cloudinary = require("../helper/imageUpload");
const path = require("path");
const multer = require("multer");
const otpGenerator = require("otp-generator");

//Login User

const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({
      success: false,
      msg: "Unauthorized user",
    });
  }
});

//  Register a new user

const registerUser = asyncHandler(async (req, res, next) => {
  console.log(req.body);

  const { name, email, phoneNumber, password } = req.body;
  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({
      success: false,
      msg: "Entered email id already registered with us. Login to continue",
    });
  }

  const user = new User({
    name,
    email,
    phoneNumber,
    password,
    userHistory: [],
  });

  // save user object
  user.save(function (err, user) {
    if (err) return next(err);
    res.status(201).json({
      success: true,
      msg: "Account Created Sucessfully. Please log in.",
    });
  });
});

const walmartRegister = async (req, res) => {
  try {
    const userDetails = require("../WalMartUser.json");
    const email = userDetails.email;

    // Check if a user with the same email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        msg: "Entered email id already registered with us. Login to contin",
      });
    }

    // If the user with the email doesn't exist, create a new user
    const newUser = new User(userDetails);
    await newUser.save();
    res.status(201).json({
      name: newUser.name,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      password: newUser.password,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//   Get user profile
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

//  Update user profile

const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.avatar = req.body.avatar || user.avatar;
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

//   Get user by ID
// access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

//Upload Profile

const storages = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    cb(null, "avatar-" + uniqueSuffix + fileExtension);
  },
});

const uploads = multer({ storage: storages });

const uploadProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    uploads.single("profile");

    if (req.file) {
      user.avatar = req.file.filename;
      await user.save();
      res.json({ message: "Profile image uploaded successfully" });
    } else {
      res.status(400).json({ error: "No file uploaded" });
    }
  }
};

//Video Verification Status

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const VerficationStatus = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    upload.fields([{ name: "video" }, { name: "aadhar" }]);
    const { video, aadhar } = req.files;

    if (!video || !aadhar) {
      return res.status(400).json({
        error: "Video and Aadhar files are required for verification",
      });
    }
    user.verificationStatus = true;
    await user.save();

    res.json({ message: "Identity verified successfully" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
};

//3.Home
// user - Destination and start point
const userStatus = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.destinationpt = req.body.destinationpt || user.destinationpt;
    user.startingpt = req.body.startingpt || user.startingpt;

    await user.save();
    res.json({ message: "Destinationa and Starting point save sucessfully" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
};

//User History
const userHistory = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    startingpt = user.startingpt;
    destinationpt = user.destinationpt;
    const history = await User.findByIdAndUpdate(user._id, {
      $push: {
        userHistory: {
          startingpt,
          destinationpt,
          timestamp: new Date(),
        },
      },
    });

    res.json({
      _id: history._id,
      name: history.name,
      email: history.email,
      avatar: history.avatar,
      destinationpt: history.destinationpt,
      startingpt: history.startingpt,
      userHistory: history.userHistory,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
};

//Get History
const getHistory = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    const userHistory = user ? user.userHistory : [];
    res.json(userHistory);
  } else {
    res.status(404);
    throw new Error("User not found");
  }
};

//otp verification

// Generate and send OTP to the customer
const sendOtp = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    const otp = otpGenerator.generate(6, {
      alphabets: false,
      specialChars: false,
    });

    user.phoneNumber = user.phoneNumber;
    user.otp = otp;

    await user.save();
    res.json({
      _id: user._id,
      phoneNumber: user.phoneNumber,
      otp: user.otp,
      message: "OTP sent successfully",
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
};

//Verify OTP

const verifyOtp = async (req, res) => {
  const userId = req.user._id;
  const providedOtp = req.body.otp;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.otp === providedOtp) {
      user.otp = "";
      await user.save();
      //res.redirect("/reward");
      res.json({ message: "OTP verified successfully" });
    } else {
      res.status(400).json({ error: "Invalid OTP" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to verify OTP" });
  }
};

//reward
const reward = async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await User.findById(userId);
    if (user) {
      user.rewardPoints += 10;
      await user.save();
      res.json({
        message: "Congratulations! You unlocked a reward!",
        rewardPoints: user.rewardPoints,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add reward points" });
  }
};

module.exports = {
  authUser,
  registerUser,
  walmartRegister,
  getUserProfile,
  updateUserProfile,
  getUserById,
  uploadProfile,
  VerficationStatus,
  userHistory,
  getHistory,
  userStatus,
  sendOtp,
  verifyOtp,
  reward,
};
