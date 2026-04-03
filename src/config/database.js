const mongoose = require("mongoose");
const { env } = require("./env");

async function connectDatabase() {
  if (!env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB");
}

module.exports = { connectDatabase };
