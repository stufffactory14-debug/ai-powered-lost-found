require("dotenv").config();

const { getExistingTextCollection, getTextCollectionName } = require("../src/config/chroma");

async function run() {
  const collection = await getExistingTextCollection();
  const records = await collection.get({
    include: ["embeddings", "metadatas"],
  });

  const ids = records.ids || [];
  const metadatas = records.metadatas || [];
  const embeddings = records.embeddings || [];

  if (ids.length === 0) {
    throw new Error(`Collection ${getTextCollectionName()} contains no records.`);
  }

  if (embeddings.length !== ids.length) {
    throw new Error("The number of retrieved embeddings does not match the record count.");
  }

  for (let index = 0; index < ids.length; index += 1) {
    const embedding = embeddings[index];

    if (!Array.isArray(embedding) || embedding.length !== 3072) {
      throw new Error(`Record ${ids[index]} has an invalid embedding dimension.`);
    }

    console.log(JSON.stringify({
      recordId: ids[index],
      metadata: metadatas[index] || {},
      embeddingDimension: embedding.length,
    }));
  }
}

run().catch((error) => {
  console.error(`Chroma item verification failed: ${error.message}`);
  process.exitCode = 1;
});
