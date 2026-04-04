const cloudinary = require("cloudinary").v2;
const { env } = require("./env");

const cloudName = env.CLOUDINARY_CLOUD_NAME.trim().toLowerCase();
const apiKey = env.CLOUDINARY_API_KEY.trim();
const apiSecret = env.CLOUDINARY_SECRET.trim();

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret
});

module.exports = { cloudinary };
