const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const { createClaim } = require("../controllers/claimController");

const router = express.Router();

router.post("/", authenticate, createClaim);

module.exports = router;
