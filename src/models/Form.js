const mongoose = require("mongoose");
const crypto = require("crypto");

function generateShareToken() {
  return crypto.randomBytes(24).toString("base64url");
}

const logicRuleSchema = new mongoose.Schema(
  {
    condition: {
      field: { type: String, required: true },
      op: { type: String, required: true },
      value: { type: mongoose.Schema.Types.Mixed }
    },
    action: {
      type: {
        type: String,
        enum: ["show", "hide", "jump"],
        required: true
      },
      targets: [{ type: String }],
      destination: { type: String }
    }
  },
  { _id: false }
);

const fieldSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    order: { type: Number, required: true },
    label: { type: String, required: true },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    validation: { type: mongoose.Schema.Types.Mixed, default: {} },
    logic: { type: [logicRuleSchema], default: [] }
  },
  { _id: false }
);

const formSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    version: {
      type: Number,
      default: 1
    },
    theme: {
      preset: {
        type: String,
        default: "minimal"
      },
      custom_css: {
        type: String,
        default: ""
      }
    },
    fields: {
      type: [fieldSchema],
      default: []
    },
    shareToken: {
      type: String,
      default: generateShareToken,
      unique: true,
      index: true
    },
    requireSignupToSubmit: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Form = mongoose.model("Form", formSchema);

module.exports = { Form, generateShareToken };
