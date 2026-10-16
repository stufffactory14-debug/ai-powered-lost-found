const assert = require("node:assert/strict");

const geminiPath = require.resolve("../src/config/gemini");
const chromaPath = require.resolve("../src/config/chroma");
const servicePath = require.resolve("../src/services/itemImageEmbeddingService");
let upsertPayload;
let embedding = Array.from({ length: 3072 }, () => 0.1);

require.cache[geminiPath] = {
  id: geminiPath,
  filename: geminiPath,
  loaded: true,
  exports: {
    EMBEDDING_DIMENSION: 3072,
    generateImageEmbedding: async (buffer, mimeType) => {
      assert.ok(Buffer.isBuffer(buffer));
      assert.equal(mimeType, "image/png");
      return embedding;
    },
  },
};
require.cache[chromaPath] = {
  id: chromaPath,
  filename: chromaPath,
  loaded: true,
  exports: {
    getImageCollection: async () => ({ upsert: async (payload) => { upsertPayload = payload; } }),
  },
};

const { downloadImage, indexItemImage } = require(servicePath);
const originalFetch = global.fetch;

function mockImageResponse(mimeType = "image/png") {
  return {
    ok: true,
    headers: { get: (name) => name === "content-type" ? mimeType : null },
    arrayBuffer: async () => Uint8Array.from([137, 80, 78, 71]).buffer,
  };
}

(async () => {
  global.fetch = async () => mockImageResponse();
  const result = await indexItemImage({
    _id: "item-1",
    imageUrl: "https://res.cloudinary.com/demo/image/upload/sample.png",
    type: "FOUND",
    category: "Electronics",
  });
  assert.deepEqual(result, { itemId: "item-1", collection: "lost_found_image_embeddings" });
  assert.deepEqual(upsertPayload.ids, ["item-1"]);
  assert.equal(upsertPayload.embeddings[0].length, 3072);
  assert.deepEqual(upsertPayload.metadatas, [{ type: "FOUND", category: "Electronics" }]);

  await assert.rejects(
    () => downloadImage("https://example.com/image.png"),
    /Cloudinary HTTP\(S\) URL/,
  );

  global.fetch = async () => mockImageResponse("image/gif");
  await assert.rejects(() => downloadImage("https://res.cloudinary.com/demo/image/upload/sample.gif"), /unsupported/);

  global.fetch = async () => { throw new Error("network failure"); };
  await assert.rejects(() => downloadImage("https://res.cloudinary.com/demo/image/upload/sample.png"), /download failed/);

  global.fetch = async () => mockImageResponse();
  embedding = [0.1];
  await assert.rejects(
    () => indexItemImage({ _id: "item-2", imageUrl: "https://res.cloudinary.com/demo/image/upload/sample.png", type: "LOST", category: "Bags" }),
    /3072/,
  );

  await assert.rejects(() => indexItemImage({ _id: "item-3" }), /image URL is required/);
  console.log("Image embedding validation, dimension, upsert, failure, and no-image checks passed.");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => {
  global.fetch = originalFetch;
});
