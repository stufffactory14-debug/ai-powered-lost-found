const assert = require("node:assert/strict");

const mongoosePath = require.resolve("mongoose");
const itemPath = require.resolve("../src/models/Item");
const claimModelPath = require.resolve("../src/models/Claim");
const controllerPath = require.resolve("../src/controllers/claimController");

let item;
let claim;

require.cache[mongoosePath] = { id: mongoosePath, filename: mongoosePath, loaded: true, exports: { isValidObjectId: (value) => /^claim|item/.test(value) } };
require.cache[itemPath] = {
  id: itemPath,
  filename: itemPath,
  loaded: true,
  exports: {
    findById: async () => item,
    find: (filter) => ({
      select: () => ({ lean: async () => (filter.userId === "owner-1" ? [{ _id: "item-1" }] : []) }),
      lean: async () => [item],
    }),
  },
};
require.cache[claimModelPath] = {
  id: claimModelPath,
  filename: claimModelPath,
  loaded: true,
  exports: {
    findById: async () => claim,
    findOneAndUpdate: async (filter, update) => {
      if (filter.status !== claim.status || (filter.clarificationQuestion === null && claim.clarificationQuestion)) return null;
      if (filter.clarificationReply === null && claim.clarificationReply) return null;
      Object.assign(claim, update.$set);
      return claim;
    },
    find: (filter) => ({ sort: () => ({ lean: async () => {
      if (typeof filter.claimedBy === "string") return filter.claimedBy === claim.claimedBy ? [claim] : [];
      return filter.itemId?.$in?.includes(claim.itemId) && filter.claimedBy?.$ne !== claim.claimedBy ? [claim] : [];
    } }) }),
  },
};

const { getMyClaims, getReceivedClaims, requestClarification, replyToClarification, reviewClaim } = require(controllerPath);

function responseFor() {
  const response = { statusCode: 200, body: null };
  return { response, res: { status(code) { response.statusCode = code; return this; }, json(body) { response.body = body; return this; } } };
}

async function call(handler, request) {
  const { response, res } = responseFor();
  await handler(request, res);
  return response;
}

(async () => {
  item = { _id: "item-1", userId: "owner-1", status: "ACTIVE", type: "FOUND", title: "Phone" };
  claim = { _id: "claim-1", itemId: "item-1", claimedBy: "claimant-1", status: "PENDING", verificationAnswer: "blue case", clarificationQuestion: null, clarificationReply: null };

  let response = await call(requestClarification, { params: { claimId: "claim-1" }, body: { question: "What color is the case?" }, userId: "owner-1" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.claim.clarificationQuestion, "What color is the case?");
  response = await call(requestClarification, { params: { claimId: "claim-1" }, body: { question: "Another question" }, userId: "owner-1" });
  assert.equal(response.statusCode, 409);

  claim.clarificationQuestion = null;
  response = await call(requestClarification, { params: { claimId: "claim-1" }, body: { question: "Question" }, userId: "other-user" });
  assert.equal(response.statusCode, 403);
  response = await call(requestClarification, { params: { claimId: "claim-1" }, body: { question: "   " }, userId: "owner-1" });
  assert.equal(response.statusCode, 400);

  claim.clarificationQuestion = "What color is the case?";
  item.status = "RESOLVED";
  response = await call(replyToClarification, { params: { claimId: "claim-1" }, body: { reply: "Blue" }, userId: "claimant-1" });
  assert.equal(response.statusCode, 409);
  item.status = "ACTIVE";
  response = await call(replyToClarification, { params: { claimId: "claim-1" }, body: { reply: "Blue" }, userId: "claimant-1" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.claim.clarificationReply, "Blue");
  response = await call(replyToClarification, { params: { claimId: "claim-1" }, body: { reply: "Again" }, userId: "claimant-1" });
  assert.equal(response.statusCode, 409);
  claim.clarificationReply = null;
  response = await call(replyToClarification, { params: { claimId: "claim-1" }, body: { reply: "Blue" }, userId: "other-user" });
  assert.equal(response.statusCode, 403);
  response = await call(replyToClarification, { params: { claimId: "claim-1" }, body: { reply: "   " }, userId: "claimant-1" });
  assert.equal(response.statusCode, 400);

  claim.clarificationReply = "Blue";
  claim.status = "ACCEPTED";
  response = await call(requestClarification, { params: { claimId: "claim-1" }, body: { question: "After review" }, userId: "owner-1" });
  assert.equal(response.statusCode, 409);
  response = await call(replyToClarification, { params: { claimId: "claim-1" }, body: { reply: "After review" }, userId: "claimant-1" });
  assert.equal(response.statusCode, 409);
  claim.status = "PENDING";
  claim.clarificationReply = null;
  response = await call(reviewClaim, { params: { claimId: "claim-1" }, body: { status: "ACCEPTED" }, userId: "owner-1" });
  assert.equal(response.statusCode, 409);
  claim.clarificationReply = "Blue";
  response = await call(getReceivedClaims, { userId: "owner-1" });
  assert.equal(response.body.claims[0].clarificationReply, "Blue");
  assert.equal(response.body.claims[0].verificationAnswer, "blue case");
  response = await call(getReceivedClaims, { userId: "other-user" });
  assert.deepEqual(response.body.claims, []);
  response = await call(getMyClaims, { userId: "claimant-1" });
  assert.equal(response.body.claims[0].clarificationQuestion, "What color is the case?");
  assert.equal(response.body.claims[0].item.title, "Phone");

  console.log("Claim clarification ownership, validation, one-time transitions, and participant-read checks passed.");
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
