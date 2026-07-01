import { MongoClient, Db } from "mongodb";

const isDevelopment = process.env.NODE_ENV === "development";
const MONGODB_URI = isDevelopment
  ? (process.env.MONGODB_URI_DEV || "")
  : (process.env.MONGODB_URI_PRO || "");
const MONGODB_DB = isDevelopment
  ? (process.env.MONGODB_DB_TEST || "")
  : (process.env.MONGODB_DB || "");  // Database name

if (!MONGODB_URI) {
  throw new Error("⚠️ Please add your Mongo URI to .env.local");
}

if (!MONGODB_DB) {
  throw new Error(
    isDevelopment
      ? "⚠️ Please add MONGODB_DB_TEST to .env.local"
      : "⚠️ Please add MONGODB_DB to .env.local"
  );
}

console.log(`🗄️ MongoDB [${isDevelopment ? "DEV" : "PROD"}] → ${MONGODB_DB}`);

declare global {
  var _mongoClientPromise: Promise<{ client: MongoClient; db: Db }> | undefined;
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (global._mongoClientPromise) {
    return global._mongoClientPromise;
  }

  const client = new MongoClient(MONGODB_URI);
  global._mongoClientPromise = client.connect().then((connectedClient) => {
    console.log("✅ MongoDB Connected Successfully!");
    return { client: connectedClient, db: connectedClient.db(MONGODB_DB) };
  }).catch(err => {
    global._mongoClientPromise = undefined;
    throw err;
  });

  return global._mongoClientPromise;
}
