const assert = require("node:assert/strict");

process.env.SEMANTIC_SEARCH_MAX_DISTANCE = "0.75";

const mockedItems = new Map();
const controllerPath = require.resolve("../src/controllers/itemController");
const itemPath = require.resolve("../src/models/Item");
const geminiPath = require.resolve("../src/config/gemini");
const chromaPath = require.resolve("../src/config/chroma");
const cloudinaryPath = require.resolve("../src/config/cloudinary");
const embeddingServicePath = require.resolve("../src/services/itemEmbeddingService");

const Item = {
  find: (filter) => ({
    populate: async () => [...filter._id.$in].map((id) => mockedItems.get(id)).filter(Boolean),
  }),
};
let distances = [];

require.cache[itemPath] = { id: itemPath, filename: itemPath, loaded: true, exports: Item };
require.cache[geminiPath] = { id: geminiPath, filename: geminiPath, loaded: true, exports: { generateEmbedding: async () => [1, 2, 3] } };
require.cache[chromaPath] = {
  id: chromaPath,
  filename: chromaPath,
  loaded: true,
  exports: { getExistingTextCollection: async () => ({ query: async () => ({ ids: [["near", "far"]], distances: [distances] }) }) },
};
require.cache[cloudinaryPath] = { id: cloudinaryPath, filename: cloudinaryPath, loaded: true, exports: { cloudinary: {}, isCloudinaryConfigured: () => false } };
require.cache[embeddingServicePath] = { id: embeddingServicePath, filename: embeddingServicePath, loaded: true, exports: { indexItemText: async () => {} } };

mockedItems.set("near", { _id: "near", title: "Near result", toObject() { return { _id: "near", title: this.title }; } });
mockedItems.set("far", { _id: "far", title: "Far result", toObject() { return { _id: "far", title: this.title }; } });

const { searchItems } = require(controllerPath);

async function callSearch() {
  const response = { statusCode: 200, body: null };
  const res = {
    status(code) { response.statusCode = code; return this; },
    json(body) { response.body = body; return this; },
  };
  await searchItems({ query: { q: "bag lost", limit: "2" } }, res);
  return response;
}

(async () => {
  distances = [0.44, 0.88];
  let response = await callSearch();
  assert.deepEqual(response.body.items.map((item) => item._id), ["near"]);

  distances = [0.88, 0.91];
  response = await callSearch();
  assert.deepEqual(response.body, { success: true, items: [] });

  distances = [0.2, 0.4];
  response = await callSearch();
  assert.deepEqual(response.body.items.map((item) => item._id), ["near", "far"]);
  assert.deepEqual(response.body.items.map((item) => item.distance), [0.2, 0.4]);

  console.log("Semantic search distance filtering and ranking checks passed.");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
