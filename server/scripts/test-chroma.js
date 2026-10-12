require("dotenv").config();

const { getTextCollection, getTextCollectionName } = require("../src/config/chroma");

async function run() {
  const collection = await getTextCollection();
  const count = await collection.count();

  console.log(`Chroma collection ready: ${getTextCollectionName()}`);
  console.log(`Current record count: ${count}`);
}

run().catch((error) => {
  console.error(`Chroma connectivity test failed: ${error.message}`);
  process.exitCode = 1;
});
