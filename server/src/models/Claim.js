const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Item",
  },
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  verificationAnswer: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  status: {
    type: String,
    enum: ["PENDING", "ACCEPTED", "REJECTED"],
    default: "PENDING",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
});

const Claim = mongoose.model("Claim", claimSchema);

module.exports = Claim;
