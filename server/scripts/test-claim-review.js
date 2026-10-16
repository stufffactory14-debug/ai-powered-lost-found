const assert = require("node:assert/strict");

const mongoosePath = require.resolve("mongoose");
const itemPath = require.resolve("../src/models/Item");
const claimModelPath = require.resolve("../src/models/Claim");
const controllerPath = require.resolve("../src/controllers/claimController");

let items;
let claims;
let ownedItems;

require.cache[mongoosePath] = {
  id: mongoosePath,
  filename: mongoosePath,
  loaded: true,
  exports: { isValidObjectId: (value) => /^claim|item/.test(value) },
};
require.cache[itemPath] = {
  id: itemPath,
  filename: itemPath,
  loaded: true,
  exports: {
    find(filter) {
      if (filter.userId) {
        return { select: () => ({ lean: async () => ownedItems }) };
      }
      throw new Error("Unexpected item query");
    },
    findById: async (id) => items.find((item) => item._id === id) || null,
    findOneAndUpdate: async (filter, update) => {
      const item = items.find((candidate) => candidate._id === filter._id && candidate.userId === filter.userId && candidate.status === filter.status);
      if (!item) return null;
      item.status = update.$set.status;
      return item;
    },
  },
};
require.cache[claimModelPath] = {
  id: claimModelPath,
  filename: claimModelPath,
  loaded: true,
  exports: {
    find(filter) {
      const result = claims.filter((claim) => claim.itemId === filter.itemId.$in[0] && claim.claimedBy !== filter.claimedBy.$ne);
      return { sort: () => ({ lean: async () => result }) };
    },
    findById: async (id) => claims.find((claim) => claim._id === id) || null,
    findOneAndUpdate: async (filter, update) => {
      const claim = claims.find((candidate) => candidate._id === filter._id && candidate.status === filter.status);
      if (!claim) return null;
      Object.assign(claim, update.$set);
      return claim;
    },
    updateMany: async (filter, update) => {
      claims
        .filter((claim) => claim.itemId === filter.itemId && claim.status === filter.status && claim._id !== filter._id.$ne)
        .forEach((claim) => Object.assign(claim, update.$set));
    },
  },
};

const { getReceivedClaims, reviewClaim } = require(controllerPath);

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

async function callReceived(userId) {
  const { response, res } = responseFor();
  await getReceivedClaims({ userId }, res);
  return response;
}

async function callReview(claimId, status, userId = "owner-1") {
  const { response, res } = responseFor();
  await reviewClaim({ params: { claimId }, body: { status }, userId }, res);
  return response;
}

function reset() {
  items = [{ _id: "item-1", userId: "owner-1", type: "FOUND", status: "ACTIVE" }];
  ownedItems = [{ _id: "item-1" }];
  claims = [
    { _id: "claim-1", itemId: "item-1", claimedBy: "claimant-1", status: "PENDING", verificationAnswer: "secret", createdAt: new Date(), reviewedAt: null },
    { _id: "claim-2", itemId: "item-1", claimedBy: "claimant-2", status: "PENDING", verificationAnswer: "secret-2", createdAt: new Date(), reviewedAt: null },
  ];
}

(async () => {
  reset();
  let response = await callReceived("owner-1");
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.claims.length, 2);
  assert.equal(response.body.claims[0].verificationAnswer, undefined);

  ownedItems = [];
  response = await callReceived("other-owner");
  assert.deepEqual(response.body.claims, []);

  reset();
  response = await callReview("claim-1", "ACCEPTED");
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.claim.status, "ACCEPTED");
  assert.equal(response.body.claim.verificationAnswer, undefined);
  assert.equal(items[0].status, "RESOLVED");
  assert.equal(claims.find((claim) => claim._id === "claim-2").status, "REJECTED");

  reset();
  response = await callReview("claim-1", "REJECTED");
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.claim.status, "REJECTED");

  reset();
  response = await callReview("claim-1", "ACCEPTED", "other-owner");
  assert.equal(response.statusCode, 403);
  response = await callReview("not-valid", "ACCEPTED");
  assert.equal(response.statusCode, 400);
  response = await callReview("claim-1", "PENDING");
  assert.equal(response.statusCode, 400);

  reset();
  claims[0].status = "REJECTED";
  response = await callReview("claim-1", "ACCEPTED");
  assert.equal(response.statusCode, 409);

  reset();
  items[0].status = "RESOLVED";
  response = await callReview("claim-1", "ACCEPTED");
  assert.equal(response.statusCode, 409);

  reset();
  claims[0].claimedBy = "owner-1";
  response = await callReview("claim-1", "REJECTED");
  assert.equal(response.statusCode, 400);

  reset();
  const concurrentResponses = await Promise.all([
    callReview("claim-1", "ACCEPTED"),
    callReview("claim-2", "ACCEPTED"),
  ]);
  assert.equal(concurrentResponses.filter((result) => result.statusCode === 200).length, 1);
  assert.equal(claims.filter((claim) => claim.status === "ACCEPTED").length, 1);
  assert.equal(items[0].status, "RESOLVED");

  console.log("Claim review listing, authorization, transitions, safe responses, and concurrency checks passed.");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
