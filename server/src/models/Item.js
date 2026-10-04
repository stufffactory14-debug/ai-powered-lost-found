const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["LOST", "FOUND"],
    },
    status: {
      type: String,
      required: true,
      enum: ["ACTIVE", "RESOLVED"],
      default: "ACTIVE",
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    verificationQuestion: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;
