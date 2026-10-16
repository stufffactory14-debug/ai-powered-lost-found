const assert = require("node:assert/strict");

const controllerPath = require.resolve("../src/controllers/itemController");
const itemPath = require.resolve("../src/models/Item");
const cloudinaryPath = require.resolve("../src/config/cloudinary");
const embeddingServicePath = require.resolve("../src/services/itemEmbeddingService");
const geminiPath = require.resolve("../src/config/gemini");
const categorizationPath = require.resolve("../src/services/itemCategorizationService");

let categorizationResult = { category: "Electronics" };
let createCalls = [];
let categorizationCalls = [];

const Item = {
  schema: { path: () => ({ enumValues: ["LOST", "FOUND"] }) },
  create: async (data) => {
    createCalls.push(data);
    return { ...data, _id: "created-item", toObject() { return this; } };
  },
};

require.cache[itemPath] = { id: itemPath, filename: itemPath, loaded: true, exports: Item };
require.cache[cloudinaryPath] = {
  id: cloudinaryPath,
  filename: cloudinaryPath,
  loaded: true,
  exports: { cloudinary: {}, isCloudinaryConfigured: () => false },
};
require.cache[embeddingServicePath] = {
  id: embeddingServicePath,
  filename: embeddingServicePath,
  loaded: true,
  exports: { indexItemText: async () => {} },
};
require.cache[geminiPath] = {
  id: geminiPath,
  filename: geminiPath,
  loaded: true,
  exports: { generateEmbedding: async () => [] },
};
require.cache[categorizationPath] = {
  id: categorizationPath,
  filename: categorizationPath,
  loaded: true,
  exports: {
    ALLOWED_CATEGORIES: ["Electronics", "Bags", "Documents", "Clothing", "Keys", "Jewelry", "Accessories", "Other"],
    categorizeItem: async (input) => {
      categorizationCalls.push(input);
      if (categorizationResult instanceof Error) throw categorizationResult;
      return categorizationResult;
    },
  },
};

const { createItem } = require(controllerPath);

async function callCreate(category = "Bags", overrides = {}) {
  const response = { statusCode: 200, body: null };
  const res = {
    status(code) { response.statusCode = code; return this; },
    json(body) { response.body = body; return this; },
  };
  await createItem({
    body: {
      title: "Black phone",
      description: "A black smartphone found near the library.",
      category,
      type: "FOUND",
      location: "College library",
      ...overrides,
    },
    userId: "user-1",
  }, res);
  return response;
}

(async () => {
  createCalls = [];
  categorizationCalls = [];
  categorizationResult = { category: "Electronics" };
  let response = await callCreate("Bags");
  assert.equal(response.statusCode, 201);
  assert.equal(createCalls[0].category, "Electronics");
  assert.deepEqual(categorizationCalls[0], { title: "Black phone", description: "A black smartphone found near the library." });

  categorizationResult = new Error("temporary Gemini failure");
  response = await callCreate("Bags");
  assert.equal(response.statusCode, 201);
  assert.equal(createCalls[1].category, "Bags");

  const createCountBeforeInvalid = createCalls.length;
  response = await callCreate("Furniture");
  assert.equal(response.statusCode, 400);
  assert.equal(createCalls.length, createCountBeforeInvalid);

  response = await callCreate("");
  assert.equal(response.statusCode, 400);
  assert.equal(createCalls.length, createCountBeforeInvalid);

  response = await callCreate("Bags", { type: "UNKNOWN" });
  assert.equal(response.statusCode, 400);
  assert.equal(createCalls.length, createCountBeforeInvalid);

  console.log("Item creation categorization integration checks passed.");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
