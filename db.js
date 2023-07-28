const { MongoClient } = require("mongodb");

async function main() {
  const uri =
    "mongodb+srv://junith:test123@cluster0.gyt87si.mongodb.net/?retryWrites=true&w=majority";

  const client = new MongoClient(uri);

  try {
    await client.connect();
    let collection = client.db("test").collection("bloggy_user");
    let collection2 = client.db("test").collection("bloggy_posts");
    return [collection,collection2];
  } catch (e) {
    console.error(e);
    return null;
  }
}

module.exports = {
  getDB: main().catch(console.error),
};
