const assert = require("node:assert/strict");

process.env.IMAGE_SEARCH_MAX_DISTANCE = "0.75";

const controllerPath = require.resolve("../src/controllers/itemController");
const itemPath = require.resolve("../src/models/Item");
const cloudinaryPath = require.resolve("../src/config/cloudinary");
const textEmbeddingPath = require.resolve("../src/services/itemEmbeddingService");
const imageEmbeddingPath = require.resolve("../src/services/itemImageEmbeddingService");
const categorizationPath = require.resolve("../src/services/itemCategorizationService");
const geminiPath = require.resolve("../src/config/gemini");
const chromaPath = require.resolve("../src/config/chroma");

const embedding = Array.from({ length: 3072 }, () => 0.1);
let queryResult = { ids: [[]], distances: [[]] };
let activeItems = [];
let findFilter;
let shouldFailEmbedding = false;
let shouldFailChroma = false;

const Item = {
  schema: { path: () => ({ enumValues: ["LOST", "FOUND"] }) },
  find(filter) {
    findFilter = filter;
    return {
      populate: async () => activeItems,
    };
  },
};

require.cache[itemPath] = { id: itemPath, filename: itemPath, loaded: true, exports: Item };
require.cache[cloudinaryPath] = {
  id: cloudinaryPath,
  filename: cloudinaryPath,
  loaded: true,
  exports: { cloudinary: {}, isCloudinaryConfigured: () => false },
};
require.cache[textEmbeddingPath] = {
  id: textEmbeddingPath,
  filename: textEmbeddingPath,
  loaded: true,
  exports: { indexItemText: async () => {} },
};
require.cache[imageEmbeddingPath] = {
  id: imageEmbeddingPath,
  filename: imageEmbeddingPath,
  loaded: true,
  exports: { ALLOWED_IMAGE_MIME_TYPES: ["image/jpeg", "image/png"], indexItemImage: async () => {} },
};
require.cache[categorizationPath] = {
  id: categorizationPath,
  filename: categorizationPath,
  loaded: true,
  exports: { ALLOWED_CATEGORIES: ["Electronics"], categorizeItem: async () => ({ category: "Electronics" }) },
};
require.cache[geminiPath] = {
  id: geminiPath,
  filename: geminiPath,
  loaded: true,
  exports: {
    EMBEDDING_DIMENSION: 3072,
    generateEmbedding: async () => embedding,
    generateImageEmbedding: async () => {
      if (shouldFailEmbedding) throw new Error("temporary Gemini failure");
      return embedding;
    },
  },
};
require.cache[chromaPath] = {
  id: chromaPath,
  filename: chromaPath,
  loaded: true,
  exports: {
    getExistingTextCollection: async () => ({}),
    getImageCollection: async () => {
      if (shouldFailChroma) throw new Error("Chroma unavailable");
      return { query: async () => queryResult };
    },
  },
};

const { searchItemsByImage } = require(controllerPath);

function responseFor() {
  const response = { statusCode: 200, body: null };
  return {
    response,
    res: {
      status(code) { response.statusCode = code; return this; },
      json(body) { response.body = body; return this; },
    },
  };
}

function item(id, userId = "other-user") {
  return {
    _id: id,
    userId,
    title: id,
    status: "ACTIVE",
    toObject() { return { _id: id, userId, title: id, status: "ACTIVE" }; },
  };
}

async function runSearch({ file = { mimetype: "image/png", buffer: Buffer.from("png") }, query = {}, userId = "requester" } = {}) {
  const { response, res } = responseFor();
  await searchItemsByImage({ file, query, userId }, res);
  return response;
}

(async () => {
  let response = await runSearch({ file: null });
  assert.equal(response.statusCode, 400);

  response = await runSearch({ file: { mimetype: "image/gif", buffer: Buffer.from("gif") } });
  assert.equal(response.statusCode, 400);

  queryResult = { ids: [["own", "near", "far"]], distances: [[0.1, 0.2, 0.9]] };
  activeItems = [item("own", "requester"), item("near"), item("far")];
  response = await runSearch({ query: { limit: "3" } });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.items.map(({ _id }) => _id), ["near"]);
  assert.deepEqual(findFilter, { _id: { $in: ["own", "near"] }, status: "ACTIVE" });
  assert.equal(response.body.items[0].distance, 0.2);
  assert.equal(response.body.items[0].email, undefined);

  queryResult = { ids: [["second", "first"]], distances: [[0.2, 0.4]] };
  activeItems = [item("first"), item("second")];
  response = await runSearch({ query: { limit: "2" } });
  assert.deepEqual(response.body.items.map(({ _id }) => _id), ["second", "first"]);

  queryResult = { ids: [["far"]], distances: [[0.9]] };
  activeItems = [item("far")];
  response = await runSearch();
  assert.deepEqual(response.body, { success: true, items: [] });

  shouldFailEmbedding = true;
  response = await runSearch();
  assert.equal(response.statusCode, 500);
  assert.equal(response.body.message, "Image search is temporarily unavailable.");
  shouldFailEmbedding = false;
  shouldFailChroma = true;
  response = await runSearch();
  assert.equal(response.statusCode, 500);
  shouldFailChroma = false;

  response = await runSearch({ query: { limit: "0" } });
  assert.equal(response.statusCode, 400);

  console.log("Image search validation, threshold filtering, ranking, owner exclusion, empty result, and failure checks passed.");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
