const mongoose = require("mongoose");
const Item = require("../models/Item");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");
const { indexItemText } = require("../services/itemEmbeddingService");
const {
  ALLOWED_CATEGORIES,
  categorizeItem,
} = require("../services/itemCategorizationService");
const { generateEmbedding } = require("../config/gemini");
const { getExistingTextCollection } = require("../config/chroma");

const ITEM_TYPES = ["LOST", "FOUND"];
const ITEM_STATUSES = ["ACTIVE", "RESOLVED"];
const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 50;
const MAX_SEARCH_QUERY_LENGTH = 500;
const DEFAULT_SEARCH_MAX_DISTANCE = 0.75;

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

module.exports = { createItem, getItemById, getItems, searchItems };
