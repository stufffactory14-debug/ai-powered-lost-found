const mongoose = require("mongoose");
const Item = require("../models/Item");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

const ITEM_TYPES = ["LOST", "FOUND"];
const ITEM_STATUSES = ["ACTIVE", "RESOLVED"];

function uploadImage(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "lost-and-found" },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result.secure_url);
      },
    );

    stream.end(buffer);
  });
}

function hasRequiredFields(...fields) {
  return fields.every((field) => typeof field === "string" && field.trim());
}

async function createItem(req, res) {
  const {
    title,
    description,
    category,
    type,
    location,
    verificationQuestion,
  } = req.body || {};

  if (!hasRequiredFields(title, description, category, type, location)) {
    return res.status(400).json({
      success: false,
      message: "Title, description, category, type, and location are required.",
    });
  }

  if (!Item.schema.path("type").enumValues.includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Type must be LOST or FOUND.",
    });
  }

  try {
    let imageUrl;

    if (req.file) {
      if (!isCloudinaryConfigured()) {
        return res.status(500).json({
          success: false,
          message: "Image upload service is not configured.",
        });
      }

      imageUrl = await uploadImage(req.file.buffer);
    }

    const item = await Item.create({
      title,
      description,
      category,
      type,
      location,
      verificationQuestion,
      imageUrl,
      userId: req.userId,
    });

    return res.status(201).json({ success: true, item });
  } catch (error) {
    console.error("Item creation failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to create item.",
    });
  }
}

function validateQueryValue(value, allowedValues, fieldName) {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== "string" || !allowedValues.includes(value)) {
    return `${fieldName} must be one of: ${allowedValues.join(", ")}.`;
  }

  return null;
}

function safeUserPopulate() {
  return { path: "userId", select: "name" };
}

async function getItems(req, res) {
  const { type, category, location, status } = req.query;
  const typeError = validateQueryValue(type, ITEM_TYPES, "type");
  const statusError = validateQueryValue(status, ITEM_STATUSES, "status");

  if (typeError || statusError) {
    return res.status(400).json({
      success: false,
      message: typeError || statusError,
    });
  }

  const filter = { status: status || "ACTIVE" };
  if (type) filter.type = type;
  if (typeof category === "string" && category.trim()) filter.category = category.trim();
  if (typeof location === "string" && location.trim()) filter.location = location.trim();

  try {
    const items = await Item.find(filter)
      .sort({ createdAt: -1 })
      .populate(safeUserPopulate());

    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error("Item list failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch items.",
    });
  }
}

async function getItemById(req, res) {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid item ID.",
    });
  }

  try {
    const item = await Item.findById(id).populate(safeUserPopulate());

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found.",
      });
    }

    return res.status(200).json({ success: true, item });
  } catch (error) {
    console.error("Item detail failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch item.",
    });
  }
}

module.exports = { createItem, getItemById, getItems };
