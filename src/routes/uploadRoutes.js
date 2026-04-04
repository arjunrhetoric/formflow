const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { cloudinary } = require("../config/cloudinary");
const { AppError } = require("../utils/appError");

const router = express.Router();

router.post(
  "/sign",
  asyncHandler(async (req, res) => {
    const timestamp = Math.round(Date.now() / 1000);
    const rawFolder = typeof req.body.folder === "string" ? req.body.folder : "formflow/uploads";
    const folder = rawFolder.replace(/[^\w/-]/g, "").slice(0, 120) || "formflow/uploads";
    const resourceType = req.body.resourceType || "auto";

    if (!cloudinary.config().cloud_name) {
      throw new AppError(500, "Cloudinary is not configured");
    }

    const paramsToSign = {
      folder,
      timestamp
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      cloudinary.config().api_secret
    );

    res.json({
      cloudName: cloudinary.config().cloud_name,
      apiKey: cloudinary.config().api_key,
      folder,
      resourceType,
      timestamp,
      signature
    });
  })
);

module.exports = router;
