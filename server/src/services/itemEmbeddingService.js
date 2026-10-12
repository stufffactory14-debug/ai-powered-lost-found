const {
  EMBEDDING_DIMENSION,
  generateEmbedding,
} = require("../config/gemini");
const { getTextCollection } = require("../config/chroma");

function buildItemText({ title, description }) {
  return `Title: ${title}\nDescription: ${description}`.trim();
}

async function indexItemText(item) {
  const document = buildItemText(item);
  const embedding = await generateEmbedding(document);

  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Item embedding must contain exactly ${EMBEDDING_DIMENSION} values.`);
  }

  const collection = await getTextCollection();
  const itemId = item._id.toString();

  await collection.upsert({
    ids: [itemId],
    embeddings: [embedding],
    documents: [document],
    metadatas: [{
      type: item.type,
      category: item.category,
      location: item.location,
    }],
  });

  return { itemId, collection: process.env.CHROMA_TEXT_COLLECTION };
}

module.exports = { buildItemText, indexItemText };
