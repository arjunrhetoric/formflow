const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true,
      index: true
    },
    formVersion: {
      type: Number,
      default: 1
    },
    submittedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: "anon"
    },
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    respondentMeta: {
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
      completionTime: { type: Number, default: 0 }
    },
    onePerIpEnforced: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

responseSchema.index({ formId: 1, "respondentMeta.ip": 1 });
responseSchema.index(
  { formId: 1, "respondentMeta.ip": 1, onePerIpEnforced: 1 },
  {
    unique: true,
    partialFilterExpression: {
      onePerIpEnforced: true,
      "respondentMeta.ip": { $exists: true, $nin: [""] }
    }
  }
);

const Response = mongoose.model("Response", responseSchema);

module.exports = { Response };
