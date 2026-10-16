const {
  EMBEDDING_DIMENSION,
  generateImageEmbedding,
} = require("../config/gemini");
const { getImageCollection } = require("../config/chroma");

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png"];

function validateImageUrl(imageUrl) {
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    throw new Error("Image URL must be a non-empty string.");
  }

  let url;
  try {
    url = new URL(imageUrl);
  } catch {
    throw new Error("Image URL is invalid.");
  }

  if (!['http:', 'https:'].includes(url.protocol) || !/(^|\.)cloudinary\.com$/i.test(url.hostname)) {
    throw new Error("Image URL must be a Cloudinary HTTP(S) URL.");
  }

  return url;
}

async function downloadImage(imageUrl) {
  const url = validateImageUrl(imageUrl);
  let response;

  try {
    response = await fetch(url);
  } catch {
    throw new Error("Image download failed.");
  }

  if (!response.ok) {
    throw new Error("Image download failed.");
  }

  const mimeType = (response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
    throw new Error("Image content type is unsupported.");
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds the maximum allowed size.");
  }

  let buffer;
  try {
    buffer = Buffer.from(await response.arrayBuffer());
  } catch {
    throw new Error("Image download failed.");
  }

  if (buffer.length === 0) throw new Error("Image download returned no data.");
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error("Image exceeds the maximum allowed size.");

  return { buffer, mimeType };
}

async function indexItemImage(item) {
  if (!item || typeof item.imageUrl !== "string" || !item.imageUrl.trim()) {
    throw new Error("Item image URL is required for image indexing.");
  }

  const { buffer, mimeType } = await downloadImage(item.imageUrl);
  const embedding = await generateImageEmbedding(buffer, mimeType);

  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Item image embedding must contain exactly ${EMBEDDING_DIMENSION} values.`);
  }

  const collection = await getImageCollection();
  const itemId = item._id.toString();

  await collection.upsert({
    ids: [itemId],
    embeddings: [embedding],
    metadatas: [{ type: item.type, category: item.category }],
  });

  return { itemId, collection: process.env.CHROMA_IMAGE_COLLECTION || "lost_found_image_embeddings" };
}

module.exports = {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  downloadImage,
  indexItemImage,
  validateImageUrl,
};
