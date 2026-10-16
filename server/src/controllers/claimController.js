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

async function getReceivedClaims(req, res) {
  try {
    const ownedItems = await Item.find({ userId: req.userId }).select("_id").lean();
    const itemIds = ownedItems.map((item) => item._id);
    if (itemIds.length === 0) {
      return res.status(200).json({ success: true, claims: [] });
    }

    const claims = await Claim.find({
      itemId: { $in: itemIds },
      claimedBy: { $ne: req.userId },
    }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      claims: claims.map(safeClaimResponse),
    });
  } catch (error) {
    console.error("Received claims lookup failed:", error.name || "Error");
    return res.status(500).json({
      success: false,
      message: "Unable to fetch received claims.",
    });
  }
}

async function reviewClaim(req, res) {
  const { claimId } = req.params;
  const { status } = req.body || {};

  if (!mongoose.isValidObjectId(claimId)) {
    return res.status(400).json({ success: false, message: "Invalid claim ID." });
  }

  if (!["ACCEPTED", "REJECTED"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "status must be ACCEPTED or REJECTED.",
    });
  }

  try {
    const claim = await Claim.findById(claimId);
    if (!claim) {
      return res.status(404).json({ success: false, message: "Claim not found." });
    }

    if (claim.status !== "PENDING") {
      return res.status(409).json({
        success: false,
        message: "Only pending claims can be reviewed.",
      });
    }

    const item = await Item.findById(claim.itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found." });
    }

    if (item.userId?.toString() !== req.userId?.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the item owner can review this claim.",
      });
    }

    if (claim.claimedBy?.toString() === req.userId?.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot review your own claim.",
      });
    }

    let reviewedClaim;
    if (status === "ACCEPTED") {
      if (item.status !== "ACTIVE") {
        return res.status(409).json({
          success: false,
          message: "Only claims for ACTIVE items can be accepted.",
        });
      }

      // Atomically acquire the ACTIVE item before accepting. A concurrent
      // acceptance for any claim on this item will receive no matching item.
      const resolvedItem = await Item.findOneAndUpdate(
        { _id: item._id, userId: req.userId, status: "ACTIVE" },
        { $set: { status: "RESOLVED" } },
        { new: true },
      );
      if (!resolvedItem) {
        return res.status(409).json({
          success: false,
          message: "This item has already been resolved by another review.",
        });
      }

      reviewedClaim = await Claim.findOneAndUpdate(
        { _id: claimId, status: "PENDING" },
        { $set: { status: "ACCEPTED", reviewedAt: new Date() } },
        { new: true },
      );
      if (!reviewedClaim) {
        return res.status(409).json({
          success: false,
          message: "This claim has already been reviewed.",
        });
      }

      await Claim.updateMany(
        { itemId: item._id, status: "PENDING", _id: { $ne: claimId } },
        { $set: { status: "REJECTED", reviewedAt: new Date() } },
      );
    } else {
      reviewedClaim = await Claim.findOneAndUpdate(
        { _id: claimId, status: "PENDING" },
        { $set: { status: "REJECTED", reviewedAt: new Date() } },
        { new: true },
      );
      if (!reviewedClaim) {
        return res.status(409).json({
          success: false,
          message: "This claim has already been reviewed.",
        });
      }
    }

    return res.status(200).json({
      success: true,
      claim: safeClaimResponse(reviewedClaim),
    });
  } catch (error) {
    console.error("Claim review failed:", error.name || "Error");
    return res.status(500).json({
      success: false,
      message: "Unable to review claim.",
    });
  }
}

module.exports = { createClaim, getReceivedClaims, reviewClaim };
