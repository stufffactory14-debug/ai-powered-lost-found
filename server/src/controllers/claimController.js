const mongoose = require("mongoose");
const Claim = require("../models/Claim");
const Item = require("../models/Item");

const MAX_VERIFICATION_ANSWER_LENGTH = 500;

function safeClaimResponse(claim) {
  return {
    _id: claim._id,
    itemId: claim.itemId,
    claimedBy: claim.claimedBy,
    status: claim.status,
    createdAt: claim.createdAt,
    reviewedAt: claim.reviewedAt,
  };
}

async function createClaim(req, res) {
  const { itemId, verificationAnswer } = req.body || {};

  if (typeof itemId !== "string" || !mongoose.isValidObjectId(itemId)) {
    return res.status(400).json({
      success: false,
      message: "A valid itemId is required.",
    });
  }

  if (
    typeof verificationAnswer !== "string"
    || !verificationAnswer.trim()
    || verificationAnswer.trim().length > MAX_VERIFICATION_ANSWER_LENGTH
  ) {
    return res.status(400).json({
      success: false,
      message: `verificationAnswer must be a non-empty string of ${MAX_VERIFICATION_ANSWER_LENGTH} characters or fewer.`,
    });
  }

  try {
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found." });
    }

    if (item.type !== "FOUND") {
      return res.status(400).json({
        success: false,
        message: "Claims can only be submitted for FOUND items.",
      });
    }

    if (item.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Claims can only be submitted for ACTIVE items.",
      });
    }

    if (item.userId?.toString() === req.userId?.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot claim your own item.",
      });
    }

    const existingPendingClaim = await Claim.findOne({
      itemId,
      claimedBy: req.userId,
      status: "PENDING",
    });
    if (existingPendingClaim) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending claim for this item.",
      });
    }

    const claim = await Claim.create({
      itemId,
      claimedBy: req.userId,
      verificationAnswer: verificationAnswer.trim(),
    });

    return res.status(201).json({
      success: true,
      claim: safeClaimResponse(claim),
    });
  } catch (error) {
    console.error("Claim submission failed:", error.name || "Error");
    return res.status(500).json({
      success: false,
      message: "Unable to submit claim.",
    });
  }
}

module.exports = { createClaim };
