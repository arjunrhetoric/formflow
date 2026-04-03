const dotenv = require("dotenv");

dotenv.config();

const env = {
  PORT: Number(process.env.PORT || 4000),
  MONGODB_URI: process.env.MONGODB_URI || "",
  JWT_SECRET: process.env.JWT_SECRET || "change_me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_SECRET: process.env.CLOUDINARY_SECRET || "",
  REDIS_URL: process.env.REDIS_URL || "",
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ||
    "http://localhost:3000,http://localhost:5173"
};

module.exports = { env };
