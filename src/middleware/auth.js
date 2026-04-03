const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { User } = require("../models/User");
const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/appError");

const requireAuth = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    throw new AppError(401, "Authentication required");
  }

  const payload = jwt.verify(token, env.JWT_SECRET);
  const user = await User.findById(payload.sub).select("-passwordHash");

  if (!user) {
    throw new AppError(401, "Invalid token");
  }

  req.user = user;
  next();
});

module.exports = { requireAuth };
