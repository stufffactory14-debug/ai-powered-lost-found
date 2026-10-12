const {
  DEFAULT_TEXT_GENERATION_MODEL,
  generateText,
} = require("../config/gemini");

// Item.category is currently free text; this controlled vocabulary matches the
// categories already demonstrated by the project and keeps AI output predictable.
const ALLOWED_CATEGORIES = [
  "Electronics",
  "Bags",
  "Documents",
  "Clothing",
  "Keys",
  "Jewelry",
  "Accessories",
  "Other",
];

function buildCategorizationPrompt(title, description) {
  return [
    "Categorize this lost-and-found item.",
    `Allowed categories: ${ALLOWED_CATEGORIES.join(", ")}.`,
    'Return exactly one JSON object in this shape: {"category":"<one allowed category>"}.',
    `Title: ${title.trim()}`,
    `Description: ${description.trim()}`,
  ].join("\n");
}

function getErrorStatus(error) {
  return error?.status || error?.statusCode || error?.response?.status;
}

function getNestedNetworkCode(error) {
  let current = error;
  for (let depth = 0; current && depth < 4; depth += 1) {
    if (typeof current.code === "string") return current.code;
    current = current.cause;
  }
  return null;
}

function sanitizeCauseMessage(message) {
  const normalized = typeof message === "string" ? message.toLowerCase() : "";
  if (normalized.includes("getaddrinfo") && normalized.includes("enotfound")) return "DNS lookup failed";
  if (normalized.includes("fetch failed")) return "fetch failed";
  if (normalized.includes("timeout")) return "request timed out";
  if (normalized.includes("tls") || normalized.includes("certificate")) return "TLS failure";
  return normalized ? "SDK request failed" : "unknown error";
}

function getSafeCauseChain(error) {
  const chain = [];
  let current = error;
  for (let depth = 0; current && depth < 4; depth += 1) {
    chain.push({
      name: typeof current.name === "string" ? current.name : "Error",
      code: typeof current.code === "string" ? current.code : null,
      message: sanitizeCauseMessage(current.message),
    });
    current = current.cause;
  }
  return chain;
}

function getSafeApiErrorDetails(error) {
  const details = {
    status: Number.isInteger(error?.status) ? error.status : null,
    code: null,
    statusText: null,
    message: null,
  };
  const rawMessage = typeof error?.message === "string" ? error.message : "";
  const jsonStart = rawMessage.indexOf("{");

  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(rawMessage.slice(jsonStart));
      const apiError = parsed.error || parsed;
      details.code = apiError.code ?? null;
      details.statusText = typeof apiError.status === "string" ? apiError.status : null;
      details.message = typeof apiError.message === "string"
        ? apiError.message.replace(/AIza[\w-]+/g, "[redacted]").replace(/key=[^\s&]+/gi, "key=[redacted]").slice(0, 200)
        : null;
    } catch {
      // Keep only the typed HTTP status when the SDK message is not JSON.
    }
  }

  return details;
}

function classifyCategorizationError(error) {
  const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";
  const status = getErrorStatus(error);

  if (!process.env.GEMINI_API_KEY || message.includes("api key") || message.includes("unauthenticated") || status === 401) {
    return "authentication/api key";
  }
  if (status === 403 || message.includes("permission") || message.includes("quota") || message.includes("resource exhausted")) {
    return "permission/quota";
  }
  if (status === 404 || message.includes("not found") || message.includes("model") && message.includes("unavailable")) {
    return "model not found or unavailable";
  }
  if (status === 400 || message.includes("schema") || message.includes("invalid argument") || message.includes("structured")) {
    return "request/structured-output validation";
  }
  if ((error?.code && ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"].includes(error.code))
    || message.includes("fetch failed") || message.includes("network")) {
    return "network failure";
  }
  return "unexpected SDK response";
}

function createCategorizationError(message, diagnosticCategory) {
  const error = new Error(message);
  error.diagnosticCategory = diagnosticCategory;
  return error;
}

async function categorizeItem({ title, description }) {
  if (typeof title !== "string" || !title.trim() || typeof description !== "string" || !description.trim()) {
    throw new Error("Item title and description must be non-empty strings.");
  }

  try {
    const responseText = await generateText({
      model: process.env.GEMINI_CATEGORIZATION_MODEL || DEFAULT_TEXT_GENERATION_MODEL,
      contents: buildCategorizationPrompt(title, description),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            category: { type: "STRING", format: "enum", enum: ALLOWED_CATEGORIES },
          },
          required: ["category"],
        },
      },
    });

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      throw createCategorizationError("Gemini returned malformed categorization JSON.", "request/structured-output validation");
    }

    if (!parsed || typeof parsed.category !== "string" || !ALLOWED_CATEGORIES.includes(parsed.category)) {
      throw createCategorizationError("Gemini returned an unsupported item category.", "request/structured-output validation");
    }

    return { category: parsed.category };
  } catch (error) {
    if (error.message.startsWith("Item ") || error.message.startsWith("Gemini returned")) {
      throw error;
    }

    const safeError = createCategorizationError("Item categorization is temporarily unavailable.", classifyCategorizationError(error));
    safeError.diagnosticCauseCode = getNestedNetworkCode(error);
    safeError.diagnosticCauseChain = getSafeCauseChain(error);
    const apiDetails = getSafeApiErrorDetails(error);
    safeError.diagnosticHttpStatus = apiDetails.status;
    safeError.diagnosticApiCode = apiDetails.code;
    safeError.diagnosticApiStatus = apiDetails.statusText;
    safeError.diagnosticApiMessage = apiDetails.message;
    throw safeError;
  }
}

module.exports = {
  ALLOWED_CATEGORIES,
  categorizeItem,
  classifyCategorizationError,
};
