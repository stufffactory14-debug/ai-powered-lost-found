const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const {
  createClaim,
  getReceivedClaims,
  reviewClaim,
} = require("../controllers/claimController");

const router = express.Router();

router.post("/", authenticate, createClaim);
router.get("/received", authenticate, getReceivedClaims);
router.patch("/:claimId/review", authenticate, reviewClaim);

module.exports = router;
