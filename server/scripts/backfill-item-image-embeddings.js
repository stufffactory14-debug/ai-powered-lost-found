require("dotenv").config();

const mongoose = require("mongoose");
const Item = require("../src/models/Item");
const { getImageCollection } = require("../src/config/chroma");
const { indexItemImage } = require("../src/services/itemImageEmbeddingService");

async function runBackfill() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing.");

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  try {
    const items = await Item.find({
      imageUrl: { $exists: true, $type: "string", $ne: "" },
    })
      .select("_id imageUrl type category")
      .sort({ createdAt: 1 })
      .lean();

    const collection = await getImageCollection();
    const itemIds = items.map((item) => item._id.toString());
    const stored = itemIds.length > 0
      ? await collection.get({ ids: itemIds, include: ["metadatas"] })
      : { ids: [] };
    const indexedIds = new Set((stored.ids || []).map((id) => id.toString()));

    const counts = { success: 0, skipped: 0, failed: 0 };
    for (const item of items) {
      const itemId = item._id.toString();
      if (indexedIds.has(itemId)) {
        counts.skipped += 1;
        continue;
      }

      try {
        await indexItemImage(item);
        counts.success += 1;
      } catch {
        counts.failed += 1;
        console.error(`Image embedding failed for item ${itemId}.`);
      }
    }

    return counts;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

if (require.main === module) {
  runBackfill()
    .then(({ success, skipped, failed }) => {
      console.log(`Image embedding backfill complete: success=${success}, skipped=${skipped}, failed=${failed}`);
    })
    .catch((error) => {
      console.error(`Image embedding backfill could not complete: ${error.name || "Error"}`);
      process.exitCode = 1;
    });
}

module.exports = { runBackfill };
