const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true,
      index: true
    },
    submittedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: "anon"
    },
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

const Response = mongoose.model("Response", responseSchema);

module.exports = { Response };
