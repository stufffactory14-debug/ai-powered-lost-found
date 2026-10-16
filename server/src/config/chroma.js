const { ChromaClient } = require("chromadb");

const DEFAULT_CHROMA_URL = "http://localhost:8000";
const DEFAULT_IMAGE_COLLECTION_NAME = "lost_found_image_embeddings";

function getChromaConfig() {
  const rawUrl = process.env.CHROMA_URL || DEFAULT_CHROMA_URL;
  const url = new URL(rawUrl);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("CHROMA_URL must use http or https.");
  }

  return {
    host: url.hostname,
    port: Number(url.port) || (url.protocol === "https:" ? 443 : 80),
    ssl: url.protocol === "https:",
  };
}

function getChromaClient() {
  return new ChromaClient(getChromaConfig());
}

function getTextCollectionName() {
  const collectionName = process.env.CHROMA_TEXT_COLLECTION;

  if (!collectionName) {
    throw new Error("CHROMA_TEXT_COLLECTION is not configured.");
  }

  return collectionName;
}

function getImageCollectionName() {
  return process.env.CHROMA_IMAGE_COLLECTION || DEFAULT_IMAGE_COLLECTION_NAME;
}

async function getTextCollection() {
  const client = getChromaClient();

  return client.getOrCreateCollection({
    name: getTextCollectionName(),
    embeddingFunction: null,
    metadata: { embedding_dimension: 3072 },
  });
}

async function getExistingTextCollection() {
  const client = getChromaClient();

  return client.getCollection({
    name: getTextCollectionName(),
    embeddingFunction: null,
  });
}

async function getImageCollection() {
  const client = getChromaClient();

  return client.getOrCreateCollection({
    name: getImageCollectionName(),
    embeddingFunction: null,
    metadata: { embedding_dimension: 3072 },
  });
}

module.exports = {
  getChromaClient,
  getImageCollection,
  getImageCollectionName,
  getExistingTextCollection,
  getTextCollection,
  getTextCollectionName,
};
