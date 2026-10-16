const mongoose = require("mongoose");
const Item = require("../models/Item");
const Claim = require("../models/Claim");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");
const { indexItemText } = require("../services/itemEmbeddingService");
const {
  ALLOWED_IMAGE_MIME_TYPES,
  indexItemImage,
} = require("../services/itemImageEmbeddingService");
const {
  ALLOWED_CATEGORIES,
  categorizeItem,
} = require("../services/itemCategorizationService");
const {
  EMBEDDING_DIMENSION,
  generateEmbedding,
  generateImageEmbedding,
} = require("../config/gemini");
const { getExistingTextCollection, getImageCollection } = require("../config/chroma");

const ITEM_TYPES = ["LOST", "FOUND"];
const ITEM_STATUSES = ["ACTIVE", "RESOLVED"];
const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 50;
const MAX_SEARCH_QUERY_LENGTH = 500;
const DEFAULT_SEARCH_MAX_DISTANCE = 0.75;
const DEFAULT_IMAGE_SEARCH_LIMIT = 10;
const MAX_IMAGE_SEARCH_LIMIT = 50;
const DEFAULT_IMAGE_SEARCH_MAX_DISTANCE = 0.75;

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

  const submittedCategory = category.trim();
  if (!ALLOWED_CATEGORIES.includes(submittedCategory)) {
    return res.status(400).json({
      success: false,
      message: `Category must be one of: ${ALLOWED_CATEGORIES.join(", ")}.`,
    });
  }

  try {
    let itemCategory = submittedCategory;

    try {
      const categorized = await categorizeItem({ title, description });
      if (categorized && ALLOWED_CATEGORIES.includes(categorized.category)) {
        itemCategory = categorized.category;
      }
    } catch {
      // A valid user category remains the safe fallback when Gemini is unavailable.
    }

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
      category: itemCategory,
      type,
      location,
      verificationQuestion,
      imageUrl,
      userId: req.userId,
    });

    try {
      await indexItemText(item);
    } catch (indexingError) {
      console.error("Item vector indexing failed:", indexingError.message);
      return res.status(500).json({
        success: false,
        message: "Item was saved, but text indexing failed. Retry indexing for this item.",
        itemId: item._id,
      });
    }

    if (item.imageUrl) {
      try {
        await indexItemImage(item);
      } catch (imageIndexingError) {
        console.error("Item image vector indexing failed:", imageIndexingError.message);
        return res.status(500).json({
          success: false,
          message: "Item was saved and text indexed, but image indexing failed. Retry image indexing for this item.",
          itemId: item._id,
        });
      }
    }

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

async function getMyItems(req, res) {
  const typeError = validateQueryValue(req.query.type, ITEM_TYPES, "type");
  const statusError = validateQueryValue(req.query.status, ITEM_STATUSES, "status");
  if (typeError || statusError) return res.status(400).json({ success: false, message: typeError || statusError });

  try {
    const filter = { userId: req.userId, status: req.query.status || "ACTIVE" };
    if (req.query.type) filter.type = req.query.type;
    const items = await Item.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error("Owned item lookup failed:", error.name || "Error");
    return res.status(500).json({ success: false, message: "Unable to fetch your items." });
  }
}

async function resolveMyItem(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid item ID." });
  try {
    const item = await Item.findOneAndUpdate(
      { _id: id, userId: req.userId, status: "ACTIVE" },
      { $set: { status: "RESOLVED" } },
      { new: true },
    );
    if (!item) return res.status(404).json({ success: false, message: "Active item not found or not owned by you." });
    return res.status(200).json({ success: true, item });
  } catch (error) {
    console.error("Item resolution failed:", error.name || "Error");
    return res.status(500).json({ success: false, message: "Unable to resolve item." });
  }
}

async function deleteMyItem(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid item ID." });
  try {
    const item = await Item.findOne({ _id: id, userId: req.userId });
    if (!item) return res.status(404).json({ success: false, message: "Item not found or not owned by you." });
    const claimCount = await Claim.countDocuments({ itemId: id });
    if (claimCount > 0) return res.status(409).json({ success: false, message: "Items with claims cannot be deleted." });

    const textCollection = await getExistingTextCollection();
    const imageCollection = await getImageCollection();
    await textCollection.delete({ ids: [id] });
    await imageCollection.delete({ ids: [id] });
    await Item.deleteOne({ _id: id, userId: req.userId });
    return res.status(200).json({ success: true, message: "Item deleted." });
  } catch (error) {
    console.error("Item deletion failed:", error.name || "Error");
    return res.status(500).json({ success: false, message: "Unable to delete item. Search indexes were left unchanged." });
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

function getSearchLimit() {
  const configuredDefault = Number.parseInt(process.env.SEMANTIC_SEARCH_DEFAULT_LIMIT, 10);
  const configuredMaximum = Number.parseInt(process.env.SEMANTIC_SEARCH_MAX_LIMIT, 10);
  const defaultLimit = Number.isInteger(configuredDefault) && configuredDefault > 0
    ? configuredDefault
    : DEFAULT_SEARCH_LIMIT;
  const maximum = Number.isInteger(configuredMaximum) && configuredMaximum > 0
    ? configuredMaximum
    : MAX_SEARCH_LIMIT;

  return { defaultLimit: Math.min(defaultLimit, maximum), maximum };
}

function getSearchMaxDistance() {
  const configuredDistance = Number.parseFloat(process.env.SEMANTIC_SEARCH_MAX_DISTANCE);

  return Number.isFinite(configuredDistance) && configuredDistance >= 0
    ? configuredDistance
    : DEFAULT_SEARCH_MAX_DISTANCE;
}

async function searchItems(req, res) {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (!query) {
    return res.status(400).json({
      success: false,
      message: "Search query q is required.",
    });
  }

  const maxQueryLength = Number.parseInt(process.env.SEMANTIC_SEARCH_MAX_QUERY_LENGTH, 10) || MAX_SEARCH_QUERY_LENGTH;
  if (query.length > maxQueryLength) {
    return res.status(400).json({
      success: false,
      message: `Search query must be ${maxQueryLength} characters or fewer.`,
    });
  }

  const { defaultLimit, maximum } = getSearchLimit();
  const rawLimit = req.query.limit;
  const limit = rawLimit === undefined ? defaultLimit : Number(rawLimit);

  if (!Number.isInteger(limit) || limit < 1 || limit > maximum) {
    return res.status(400).json({
      success: false,
      message: `limit must be an integer between 1 and ${maximum}.`,
    });
  }

  try {
    const queryEmbedding = await generateEmbedding(query);
    const collection = await getExistingTextCollection();
    const result = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
      include: ["metadatas", "distances"],
    });
    const rankedIds = result.ids?.[0] || [];
    const distances = result.distances?.[0] || [];
    const maxDistance = getSearchMaxDistance();
    const matchingIds = rankedIds.filter((id, index) => {
      const distance = distances[index];
      return typeof distance === "number" && Number.isFinite(distance) && distance <= maxDistance;
    });

    if (matchingIds.length === 0) {
      return res.status(200).json({ success: true, items: [] });
    }

    const items = await Item.find({ _id: { $in: matchingIds } }).populate(safeUserPopulate());
    const itemsById = new Map(items.map((item) => [item._id.toString(), item]));
    const rankedItems = matchingIds
      .map((id, index) => {
        const item = itemsById.get(id);
        if (!item) return null;

        const itemData = typeof item.toObject === "function" ? item.toObject() : item;
        const originalIndex = rankedIds.indexOf(id);
        return { ...itemData, distance: distances[originalIndex] };
      })
      .filter(Boolean);

    return res.status(200).json({ success: true, items: rankedItems });
  } catch (error) {
    console.error("Semantic item search failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Semantic search is temporarily unavailable.",
    });
  }
}

function getImageSearchConfig() {
  const configuredDefault = Number.parseInt(process.env.IMAGE_SEARCH_DEFAULT_LIMIT, 10);
  const configuredMaximum = Number.parseInt(process.env.IMAGE_SEARCH_MAX_LIMIT, 10);
  const defaultLimit = Number.isInteger(configuredDefault) && configuredDefault > 0
    ? configuredDefault
    : DEFAULT_IMAGE_SEARCH_LIMIT;
  const maximum = Number.isInteger(configuredMaximum) && configuredMaximum > 0
    ? configuredMaximum
    : MAX_IMAGE_SEARCH_LIMIT;
  const configuredDistance = Number.parseFloat(process.env.IMAGE_SEARCH_MAX_DISTANCE);
  const maxDistance = Number.isFinite(configuredDistance) && configuredDistance >= 0
    ? configuredDistance
    : DEFAULT_IMAGE_SEARCH_MAX_DISTANCE;

  return {
    defaultLimit: Math.min(defaultLimit, maximum),
    maximum,
    maxDistance,
  };
}

function userIdString(value) {
  if (!value) return "";
  if (value._id) return value._id.toString();
  return value.toString();
}

async function searchItemsByImage(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "An image file is required.",
    });
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: "Only JPEG and PNG images are supported for image search.",
    });
  }

  const { defaultLimit, maximum, maxDistance } = getImageSearchConfig();
  const rawLimit = req.query.limit;
  const limit = rawLimit === undefined ? defaultLimit : Number(rawLimit);

  if (!Number.isInteger(limit) || limit < 1 || limit > maximum) {
    return res.status(400).json({
      success: false,
      message: `limit must be an integer between 1 and ${maximum}.`,
    });
  }

  try {
    const queryEmbedding = await generateImageEmbedding(req.file.buffer, req.file.mimetype);
    if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== EMBEDDING_DIMENSION) {
      throw new Error("Image search embedding has an invalid dimension.");
    }

    const collection = await getImageCollection();
    const result = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
      include: ["distances"],
    });
    const rankedIds = result.ids?.[0] || [];
    const distances = result.distances?.[0] || [];
    const matching = rankedIds
      .map((id, index) => ({
        id: id.toString(),
        distance: distances[index],
      }))
      .filter(({ distance }) => typeof distance === "number" && Number.isFinite(distance) && distance <= maxDistance);

    if (matching.length === 0) {
      return res.status(200).json({ success: true, items: [] });
    }

    const items = await Item.find({
      _id: { $in: matching.map(({ id }) => id) },
      status: "ACTIVE",
    }).populate(safeUserPopulate());
    const itemsById = new Map(items.map((item) => [item._id.toString(), item]));
    const requesterId = userIdString(req.userId);
    const rankedItems = matching
      .map(({ id, distance }) => {
        const item = itemsById.get(id);
        if (!item || userIdString(item.userId) === requesterId) return null;
        const itemData = typeof item.toObject === "function" ? item.toObject() : item;
        return { ...itemData, distance };
      })
      .filter(Boolean);

    return res.status(200).json({ success: true, items: rankedItems });
  } catch (error) {
    console.error("Image item search failed:", error.name || "Error");
    return res.status(500).json({
      success: false,
      message: "Image search is temporarily unavailable.",
    });
  }
}

module.exports = {
  createItem,
  getMyItems,
  resolveMyItem,
  deleteMyItem,
  getItemById,
  getItems,
  searchItems,
  searchItemsByImage,
};
