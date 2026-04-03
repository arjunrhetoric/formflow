const mongoose = require("mongoose");

const formHistorySchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true,
      index: true
    },
    version: {
      type: Number,
      required: true
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

const FormHistory = mongoose.model("FormHistory", formHistorySchema);

module.exports = { FormHistory };
