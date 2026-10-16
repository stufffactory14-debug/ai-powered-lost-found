require("dotenv").config();

const { getImageCollection } = require("../src/config/chroma");
const { indexItemImage } = require("../src/services/itemImageEmbeddingService");

const TEST_IMAGE_URL = "https://res.cloudinary.com/demo/image/upload/sample.png";

async function run() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const testId = `step18-image-test-${Date.now()}`;
  let collection;

  try {
    collection = await getImageCollection();
    await indexItemImage({
      _id: testId,
      imageUrl: TEST_IMAGE_URL,
      type: "FOUND",
      category: "Other",
    });

    const stored = await collection.get({
      ids: [testId],
      include: ["embeddings", "metadatas"],
    });
    const embedding = stored.embeddings?.[0];

    if (!Array.isArray(embedding) || embedding.length !== 3072) {
      throw new Error("Stored image embedding did not contain 3072 values.");
    }

    console.log(`Real image embedding verified: collection=${process.env.CHROMA_IMAGE_COLLECTION || "lost_found_image_embeddings"}, dimension=${embedding.length}`);
  } finally {
    if (collection) {
      await collection.delete({ ids: [testId] }).catch(() => {});
      console.log("Dedicated test record cleanup attempted.");
    }
  }
}

run().catch(() => {
  console.error("Real image embedding test failed. Check Gemini, Cloudinary URL access, and Chroma connectivity.");
  process.exitCode = 1;
});
