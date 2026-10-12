require("dotenv").config();
const httpsFetch = require("./httpsFetchAdapter");

const proxyNames = ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "all_proxy", "no_proxy"];
const configuredProxies = proxyNames.filter((name) => process.env[name]);
console.log(`Proxy environment variables present: ${configuredProxies.length ? configuredProxies.join(", ") : "none"}`);

async function diagnosticFetch(input, init) {
  const requestUrl = typeof input === "string" || input instanceof URL ? new URL(input) : new URL(input.url);
  console.log(`Gemini SDK request target: ${requestUrl.hostname}${requestUrl.pathname}`);
  return httpsFetch(input, init);
}

globalThis.fetch = diagnosticFetch;

const {
  categorizeItem,
  classifyCategorizationError,
} = require("../src/services/itemCategorizationService");

async function run() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing. Add it to server/.env to run this real test.");
  }

  const baseResponse = await httpsFetch("https://generativelanguage.googleapis.com");
  console.log(`HTTPS adapter base URL status: ${baseResponse.status}`);

  const result = await categorizeItem({
    title: "Black smartphone",
    description: "A black smartphone found near the college library.",
  });

  console.log(`Gemini categorization succeeded: ${result.category}`);
}

run().catch((error) => {
  const diagnosticCategory = error.diagnosticCategory || classifyCategorizationError(error);
  console.error("Gemini categorization test failed: request did not complete.");
  console.error(`Sanitized diagnostic category: ${diagnosticCategory}`);
  if (error.diagnosticHttpStatus !== null && error.diagnosticHttpStatus !== undefined) {
    console.error(`HTTP status: ${error.diagnosticHttpStatus}`);
  }
  if (error.diagnosticApiMessage) {
    console.error(`Sanitized API error message: ${error.diagnosticApiMessage}`);
  }
  if (error.diagnosticApiStatus || error.diagnosticApiCode) {
    console.error(`Sanitized API error status/code: ${error.diagnosticApiStatus || "unknown"}/${error.diagnosticApiCode || "unknown"}`);
  }
  let current = error;
  const causeChain = [];
  for (let depth = 0; current && depth < 4; depth += 1) {
    causeChain.push({ name: current.name || "Error", code: current.code || null });
    current = current.cause;
  }
  if (error.diagnosticCauseCode) {
    console.error(`Sanitized nested cause code: ${error.diagnosticCauseCode}`);
  } else if (causeChain.some((entry) => entry.code)) {
    console.error(`Sanitized nested cause code: ${causeChain.find((entry) => entry.code).code}`);
  }
  if (error.diagnosticCauseChain) {
    console.error(`Sanitized cause chain: ${JSON.stringify(error.diagnosticCauseChain)}`);
  } else {
    console.error(`Sanitized cause chain: ${JSON.stringify(causeChain)}`);
  }
  process.exitCode = 1;
});
