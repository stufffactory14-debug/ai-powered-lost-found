require("dotenv").config();

const mongoose = require("mongoose");
const Item = require("../src/models/Item");
const { getChromaClient, getImageCollectionName } = require("../src/config/chroma");

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing.");

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  const activeItems = await Item.find({
    status: "ACTIVE",
    imageUrl: { $exists: true, $type: "string", $ne: "" },
  })
    .select("_id")
    .lean();

  const client = getChromaClient();
  const collectionName = getImageCollectionName();
  const collection = await client.getCollection({
    name: collectionName,
    embeddingFunction: null,
  });
  const stored = await collection.get({ include: ["metadatas"] });
  const vectorIds = new Set((stored.ids || []).map((id) => id.toString()));
  const matchingIds = activeItems
    .map((item) => item._id.toString())
    .filter((id) => vectorIds.has(id));

  console.log(`Image indexing diagnostic: collection=${collectionName}`);
  console.log(`ACTIVE MongoDB items with images: ${activeItems.length}`);
  console.log(`Image vector records in Chroma: ${vectorIds.size}`);
  console.log(`Matching ACTIVE MongoDB/image-vector IDs: ${matchingIds.length}`);
}

run()
  .catch((error) => {
    console.error(`Image indexing diagnostic failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
