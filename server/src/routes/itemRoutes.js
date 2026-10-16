const express = require("express");
const {
  createItem,
  getItemById,
  getItems,
  searchItems,
  searchItemsByImage,
} = require("../controllers/itemController");
const authenticate = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/search", searchItems);
router.post("/search/image", authenticate, upload.single("image"), searchItemsByImage);
router.get("/", getItems);
router.post("/", authenticate, upload.single("image"), createItem);
router.get("/:id", getItemById);

module.exports = router;
