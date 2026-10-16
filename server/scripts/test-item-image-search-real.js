require("dotenv").config();

const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Item = require("../src/models/Item");
const { getImageCollection, getImageCollectionName } = require("../src/config/chroma");

const BASE_URL = process.env.IMAGE_SEARCH_TEST_BASE_URL || "http://localhost:5000";
const MAX_CANDIDATES = 25;

function itemUserId(item) {
  return item?.userId?._id?.toString() || item?.userId?.toString();
}

async function downloadTestImage(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("existing image download returned a non-success status");

  const contentType = (response.headers.get("content-type") || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (![
    "image/jpeg",
    "image/png",
  ].includes(contentType)) {
    throw new Error("existing image is not JPEG or PNG");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
    throw new Error("existing image is empty or exceeds the upload limit");
  }

  return { buffer, contentType };
}

async function callImageSearch(image, userId) {
  const form = new FormData();
  form.append("image", new Blob([image.buffer], { type: image.contentType }), "step19-test-image");

  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "5m",
  });
  const response = await fetch(`${BASE_URL}/api/items/search/image?limit=10`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`image search returned HTTP ${response.status} with an invalid JSON body`);
  }

  if (!response.ok || !body.success) {
    throw new Error(`image search returned HTTP ${response.status}`);
  }

  return body;
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing.");
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing.");
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing.");

  const health = await fetch(`${BASE_URL}/api/health`);
  if (!health.ok) throw new Error(`backend health check returned HTTP ${health.status}`);

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  const candidates = await Item.find({
    status: "ACTIVE",
    imageUrl: { $exists: true, $type: "string", $ne: "" },
  })
    .sort({ createdAt: -1 })
    .limit(MAX_CANDIDATES)
    .lean();
  if (candidates.length === 0) throw new Error("no active image-backed items are available for testing");

  const collection = await getImageCollection();
  const indexed = await collection.get({
    ids: candidates.map((item) => item._id.toString()),
    include: ["metadatas"],
  });
  const indexedIds = new Set((indexed.ids || []).map((id) => id.toString()));
  const indexedCandidates = candidates.filter((item) => indexedIds.has(item._id.toString()));
  if (indexedCandidates.length === 0) {
    throw new Error("no active MongoDB item has a corresponding image vector in Chroma");
  }

  let target;
  let image;
  for (const candidate of indexedCandidates) {
    try {
      image = await downloadTestImage(candidate.imageUrl);
      target = candidate;
      break;
    } catch {
      // Try another existing indexed item without printing its URL or error details.
    }
  }
  if (!target) throw new Error("no existing indexed JPEG/PNG image could be downloaded");

  const targetId = target._id.toString();
  const targetOwnerId = itemUserId(target);
  if (!targetOwnerId) throw new Error("selected test item has no usable owner ID");

  // Use an unowned ID for the positive match check, then the real owner ID
  // to verify that own items are excluded by the endpoint.
  const positiveBody = await callImageSearch(image, new mongoose.Types.ObjectId().toString());
  assert.ok(Array.isArray(positiveBody.items), "image search response must contain an items array");
  assert.ok(
    positiveBody.items.some((item) => item._id === targetId),
    "the selected indexed item was not returned by image search",
  );
  assert.ok(
    positiveBody.items.every((item) => item.status === "ACTIVE"),
    "image search returned a non-ACTIVE item",
  );

  const ownBody = await callImageSearch(image, targetOwnerId);
  assert.ok(Array.isArray(ownBody.items), "own-item response must contain an items array");
  assert.ok(
    ownBody.items.every((item) => item.status === "ACTIVE"),
    "own-item search returned a non-ACTIVE item",
  );
  assert.ok(
    ownBody.items.every((item) => item.userId?._id?.toString() !== targetOwnerId),
    "image search returned an item owned by the requesting user",
  );

  console.log(`Real image search verified: collection=${getImageCollectionName()}, activeMatch=true, ownItemExcluded=true`);
}

run()
  .catch((error) => {
    console.error(`Real image search test failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
