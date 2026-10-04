const express = require("express");
const { createItem } = require("../controllers/itemController");
const authenticate = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/", authenticate, upload.single("image"), createItem);

module.exports = router;
