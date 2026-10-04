const express = require("express");
const { createItem, getItemById, getItems } = require("../controllers/itemController");
const authenticate = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/", getItems);
router.post("/", authenticate, upload.single("image"), createItem);
router.get("/:id", getItemById);

module.exports = router;
