const { GoogleGenAI } = require("@google/genai");

const EMBEDDING_MODEL = "gemini-embedding-2";
const EMBEDDING_DIMENSION = 3072;

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

module.exports = {
  EMBEDDING_DIMENSION,
  EMBEDDING_MODEL,
  generateEmbedding,
};
