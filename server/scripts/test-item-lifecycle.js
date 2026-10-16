const assert = require("node:assert/strict");

const mongoosePath = require.resolve("mongoose");
const itemPath = require.resolve("../src/models/Item");
const claimPath = require.resolve("../src/models/Claim");
const chromaPath = require.resolve("../src/config/chroma");
const controllerPath = require.resolve("../src/controllers/itemController");
let item = { _id: "item-1", userId: "owner-1", status: "ACTIVE", type: "FOUND", title: "Phone" };
let claimCount = 0;
let deletedIds = [];

require.cache[mongoosePath] = { id: mongoosePath, filename: mongoosePath, loaded: true, exports: { isValidObjectId: (id) => /^item-/.test(id) } };
require.cache[itemPath] = { id: itemPath, filename: itemPath, loaded: true, exports: {
  schema: { path: () => ({ enumValues: ["LOST", "FOUND"] }) },
  find: () => ({ sort: () => [] }),
  findOne: async (filter) => filter.userId === item.userId && filter._id === item._id ? item : null,
  findOneAndUpdate: async (filter, update) => (filter.userId === item.userId && filter._id === item._id && filter.status === item.status ? (item.status = update.$set.status, item) : null),
  deleteOne: async () => { deletedIds.push(item._id); },
} };
require.cache[claimPath] = { id: claimPath, filename: claimPath, loaded: true, exports: { countDocuments: async () => claimCount } };
require.cache[chromaPath] = { id: chromaPath, filename: chromaPath, loaded: true, exports: {
  getExistingTextCollection: async () => ({ delete: async ({ ids }) => deletedIds.push(`text:${ids[0]}`) }),
  getImageCollection: async () => ({ delete: async ({ ids }) => deletedIds.push(`image:${ids[0]}`) }),
  getImageCollectionName: () => "lost_found_image_embeddings",
} };
const { getMyItems, resolveMyItem, deleteMyItem } = require(controllerPath);

function responseFor() { const response = { statusCode: 200, body: null }; return { response, res: { status(code) { response.statusCode = code; return this; }, json(body) { response.body = body; return this; } } }; }

(async () => {
  let result = responseFor(); await getMyItems({ userId: "owner-1", query: {} }, result.res); assert.equal(result.response.statusCode, 200); assert.deepEqual(result.response.body.items, []);
  result = responseFor(); await resolveMyItem({ params: { id: "item-1" }, userId: "other" }, result.res); assert.equal(result.response.statusCode, 404);
  item.status = "ACTIVE"; result = responseFor(); await resolveMyItem({ params: { id: "item-1" }, userId: "owner-1" }, result.res); assert.equal(result.response.statusCode, 200); assert.equal(item.status, "RESOLVED");
  item.status = "ACTIVE"; claimCount = 1; result = responseFor(); await deleteMyItem({ params: { id: "item-1" }, userId: "owner-1" }, result.res); assert.equal(result.response.statusCode, 409);
  claimCount = 0; result = responseFor(); await deleteMyItem({ params: { id: "item-1" }, userId: "owner-1" }, result.res); assert.equal(result.response.statusCode, 200); assert.ok(deletedIds.includes("text:item-1")); assert.ok(deletedIds.includes("image:item-1"));
  console.log("Item lifecycle ownership, resolution, claim protection, and index cleanup checks passed.");
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
