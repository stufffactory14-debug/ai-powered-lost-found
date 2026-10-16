const express = require("express");
const {
  createItem,
  deleteMyItem,
  getMyItems,
  getItemById,
  getItems,
  resolveMyItem,
  searchItems,
  searchItemsByImage,
} = require("../controllers/itemController");
const authenticate = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/search", searchItems);
router.post("/search/image", authenticate, upload.single("image"), searchItemsByImage);
router.get("/mine", authenticate, getMyItems);
router.get("/", getItems);
router.post("/", authenticate, upload.single("image"), createItem);
router.patch("/:id/status", authenticate, resolveMyItem);
router.delete("/:id", authenticate, deleteMyItem);
router.get("/:id", getItemById);

module.exports = router;
