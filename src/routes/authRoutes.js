const express = require("express");
const bcrypt = require("bcrypt");
const { User } = require("../models/User");
const { signToken } = require("../utils/jwt");
const { AppError } = require("../utils/appError");
const { asyncHandler } = require("../utils/asyncHandler");
const { authLimiter } = require("../middleware/rateLimit");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function userResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    cursorColor: user.cursorColor || "#2563eb",
    avatar_url: user.avatar_url || ""
  };
}

router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError(400, "name, email, and password are required");
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError(409, "Email is already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: userResponse(user)
    });
  })
);

router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, "email and password are required");
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError(401, "Invalid email or password");
    }

    const token = signToken(user);
    res.json({
      token,
      user: userResponse(user)
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      user: userResponse(req.user)
    });
  })
);

// Update profile (name, cursorColor)
router.put(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, cursorColor } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) throw new AppError(404, "User not found");

    if (name) user.name = name.trim();
    if (cursorColor && /^#[0-9a-fA-F]{6}$/.test(cursorColor)) {
      user.cursorColor = cursorColor;
    }

    await user.save();
    res.json({ user: userResponse(user) });
  })
);

// Change password
router.put(
  "/password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError(400, "currentPassword and newPassword are required");
    }
    if (newPassword.length < 6) {
      throw new AppError(400, "New password must be at least 6 characters");
    }

    const user = await User.findById(req.user._id);
    if (!user) throw new AppError(404, "User not found");

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AppError(401, "Current password is incorrect");
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  })
);

module.exports = router;

