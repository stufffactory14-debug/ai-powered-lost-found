require("dotenv").config();

const {
  EMBEDDING_DIMENSION,
  EMBEDDING_MODEL,
  generateEmbedding,
} = require("../src/config/gemini");

async function run() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing. Add it to server/.env to run this test.");
  }

  const embedding = await generateEmbedding("black wallet lost near college");

  console.log(`Gemini model: ${EMBEDDING_MODEL}`);
  console.log(`Embedding length: ${embedding.length}`);
  console.log(`Expected length: ${EMBEDDING_DIMENSION}`);
  console.log("Gemini embedding test succeeded.");
}

run().catch((error) => {
  console.error(`Gemini embedding test failed: ${error.message}`);
  process.exitCode = 1;
});
