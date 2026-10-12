const { GoogleGenAI } = require("@google/genai");

const EMBEDDING_MODEL = "gemini-embedding-2";
const EMBEDDING_DIMENSION = 3072;
const DEFAULT_TEXT_GENERATION_MODEL = "gemini-3.8-flash";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({ apiKey });
}

async function generateEmbedding(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Embedding text must be a non-empty string.");
  }

  const ai = getGeminiClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      outputDimensionality: EMBEDDING_DIMENSION,
    },
  });
  const values = response.embeddings?.[0]?.values;

  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Gemini returned an invalid embedding length: ${values?.length || 0}.`);
  }

  return values;
}

async function generateText({ model, contents, config }) {
  if (typeof contents !== "string" || !contents.trim()) {
    throw new Error("Gemini text prompt must be a non-empty string.");
  }

  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: model || process.env.GEMINI_CATEGORIZATION_MODEL || DEFAULT_TEXT_GENERATION_MODEL,
    contents,
    config,
  });

  if (typeof response.text !== "string" || !response.text.trim()) {
    throw new Error("Gemini returned an empty text response.");
  }

  return response.text;
}

module.exports = {
  DEFAULT_TEXT_GENERATION_MODEL,
  EMBEDDING_DIMENSION,
  EMBEDDING_MODEL,
  generateEmbedding,
  generateText,
};
