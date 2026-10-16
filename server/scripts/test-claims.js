const assert = require("node:assert/strict");

const mongoosePath = require.resolve("mongoose");
const itemPath = require.resolve("../src/models/Item");
const claimModelPath = require.resolve("../src/models/Claim");
const controllerPath = require.resolve("../src/controllers/claimController");

let item = {
  _id: "valid-item",
  type: "FOUND",
  status: "ACTIVE",
  userId: "owner-1",
};
let pendingClaim = null;
const createdClaims = [];

require.cache[mongoosePath] = {
  id: mongoosePath,
  filename: mongoosePath,
  loaded: true,
  exports: {
    isValidObjectId: (value) => value === "valid-item",
  },
};
require.cache[itemPath] = {
  id: itemPath,
  filename: itemPath,
  loaded: true,
  exports: {
    findById: async () => item,
  },
};
require.cache[claimModelPath] = {
  id: claimModelPath,
  filename: claimModelPath,
  loaded: true,
  exports: {
    findOne: async () => pendingClaim,
    create: async (data) => {
      const claim = {
        _id: "claim-1",
        ...data,
        status: "PENDING",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        reviewedAt: null,
      };
      createdClaims.push(claim);
      return claim;
    },
  },
};

const { createClaim } = require(controllerPath);

async function callClaim(body, userId = "claimant-1") {
  const response = { statusCode: 200, body: null };
  const res = {
    status(code) { response.statusCode = code; return this; },
    json(payload) { response.body = payload; return this; },
  };
  await createClaim({ body, userId }, res);
  return response;
}

(async () => {
  pendingClaim = null;
  item = { _id: "valid-item", type: "FOUND", status: "ACTIVE", userId: "owner-1" };
  let response = await callClaim({ itemId: "valid-item", verificationAnswer: "blue mark" });
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.claim.status, "PENDING");
  assert.equal(response.body.claim.verificationAnswer, undefined);
  assert.equal(createdClaims[0].claimedBy, "claimant-1");

  response = await callClaim({ itemId: "not-an-id", verificationAnswer: "answer" });
  assert.equal(response.statusCode, 400);

  item = null;
  response = await callClaim({ itemId: "valid-item", verificationAnswer: "answer" });
  assert.equal(response.statusCode, 404);

  item = { _id: "valid-item", type: "LOST", status: "ACTIVE", userId: "owner-1" };
  response = await callClaim({ itemId: "valid-item", verificationAnswer: "answer" });
  assert.equal(response.statusCode, 400);

  item = { _id: "valid-item", type: "FOUND", status: "RESOLVED", userId: "owner-1" };
  response = await callClaim({ itemId: "valid-item", verificationAnswer: "answer" });
  assert.equal(response.statusCode, 400);

  item = { _id: "valid-item", type: "FOUND", status: "ACTIVE", userId: "claimant-1" };
  response = await callClaim({ itemId: "valid-item", verificationAnswer: "answer" });
  assert.equal(response.statusCode, 400);

  item = { _id: "valid-item", type: "FOUND", status: "ACTIVE", userId: "owner-1" };
  pendingClaim = { _id: "existing-claim", status: "PENDING" };
  response = await callClaim({ itemId: "valid-item", verificationAnswer: "answer" });
  assert.equal(response.statusCode, 409);
  pendingClaim = null;

  response = await callClaim({ itemId: "valid-item", verificationAnswer: "   " });
  assert.equal(response.statusCode, 400);
  response = await callClaim({ itemId: "valid-item", verificationAnswer: "x".repeat(501) });
  assert.equal(response.statusCode, 400);

  console.log("Claim submission validation, ownership, duplicate, and safe-response checks passed.");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
