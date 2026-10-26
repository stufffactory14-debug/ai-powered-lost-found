const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const {
  createClaim,
  getReceivedClaims,
  getMyClaims,
  requestClarification,
  replyToClarification,
  reviewClaim,
} = require("../controllers/claimController");

const router = express.Router();

router.post("/", authenticate, createClaim);
router.get("/received", authenticate, getReceivedClaims);
router.get("/mine", authenticate, getMyClaims);
router.post("/:claimId/clarification-request", authenticate, requestClarification);
router.post("/:claimId/clarification-reply", authenticate, replyToClarification);
router.patch("/:claimId/review", authenticate, reviewClaim);

module.exports = router;
