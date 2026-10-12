const assert = require("node:assert/strict");

const geminiPath = require.resolve("../src/config/gemini");
const servicePath = require.resolve("../src/services/itemCategorizationService");
let mockedResponse = '{"category":"Electronics"}';

require.cache[geminiPath] = {
  id: geminiPath,
  filename: geminiPath,
  loaded: true,
  exports: {
    DEFAULT_TEXT_GENERATION_MODEL: "gemini-3.8-flash",
    generateText: async (request) => {
      assert.equal(request.model, "gemini-3.8-flash");
      assert.equal(request.config.responseMimeType, "application/json");
      assert.match(request.contents, /Allowed categories:/);
      return mockedResponse;
    },
  },
};

const { categorizeItem } = require(servicePath);

(async () => {
  assert.deepEqual(await categorizeItem({ title: "Phone", description: "Black smartphone" }), { category: "Electronics" });

  mockedResponse = '{"category":"Not a project category"}';
  await assert.rejects(
    () => categorizeItem({ title: "Phone", description: "Black smartphone" }),
    /unsupported item category/,
  );

  mockedResponse = "not-json";
  await assert.rejects(
    () => categorizeItem({ title: "Phone", description: "Black smartphone" }),
    /malformed categorization JSON/,
  );

  await assert.rejects(
    () => categorizeItem({ title: "", description: "Black smartphone" }),
    /title and description must be non-empty strings/,
  );

  console.log("Item categorization validation and mocked Gemini checks passed.");
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
