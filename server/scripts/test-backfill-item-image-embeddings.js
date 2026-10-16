const assert = require("node:assert/strict");

process.env.MONGODB_URI = "mongodb://test.invalid/lost-found";

const mongoosePath = require.resolve("mongoose");
const itemPath = require.resolve("../src/models/Item");
const chromaPath = require.resolve("../src/config/chroma");
const imageServicePath = require.resolve("../src/services/itemImageEmbeddingService");

let indexedItems = [];
let items = [
  { _id: "item-1", imageUrl: "https://res.cloudinary.com/demo/one.png", type: "FOUND", category: "Bags" },
  { _id: "item-2", imageUrl: "https://res.cloudinary.com/demo/two.png", type: "LOST", category: "Electronics" },
  { _id: "item-3", imageUrl: "https://res.cloudinary.com/demo/three.png", type: "FOUND", category: "Other" },
];

require.cache[mongoosePath] = {
  id: mongoosePath,
  filename: mongoosePath,
  loaded: true,
  exports: {
    connect: async () => {},
    disconnect: async () => {},
  },
};
require.cache[itemPath] = {
  id: itemPath,
  filename: itemPath,
  loaded: true,
  exports: {
    find: () => ({
      select: () => ({
        sort: () => ({ lean: async () => items }),
      }),
    }),
  },
};
require.cache[chromaPath] = {
  id: chromaPath,
  filename: chromaPath,
  loaded: true,
  exports: {
    getImageCollection: async () => ({
      get: async () => ({ ids: ["item-2"] }),
    }),
  },
};
require.cache[imageServicePath] = {
  id: imageServicePath,
  filename: imageServicePath,
  loaded: true,
  exports: {
    indexItemImage: async (item) => {
      indexedItems.push(item._id.toString());
      if (item._id.toString() === "item-3") throw new Error("simulated failure");
    },
  },
};

const { runBackfill } = require("./backfill-item-image-embeddings");

(async () => {
  const counts = await runBackfill();
  assert.deepEqual(counts, { success: 1, skipped: 1, failed: 1 });
  assert.deepEqual(indexedItems, ["item-1", "item-3"]);
  console.log("Image backfill skip, sequential processing, success, and failure handling checks passed.");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
