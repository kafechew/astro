import { MongoClient } from 'mongodb';

const MONGODB_URI = import.meta.env.MONGODB_URI;
let client;
let clientPromise;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local or .env');
}

// Helper function to parse database name from URI
function getDbNameFromUri(uri) {
  try {
    const url = new URL(uri);
    // The pathname usually starts with a '/', so we remove it.
    // If no path is specified, it means the default 'test' db or admin db might be used,
    // or the driver might require a db name to be explicitly passed to client.db().
    // For Atlas, the db name might not be in the path if using default.
    // It's safer to let the user specify or handle it if not present.
    const dbName = url.pathname.substring(1);
    if (dbName && !dbName.includes('/')) { // Simple check if it's a valid-looking db name
        return dbName;
    }
    // Fallback or further logic might be needed if db name isn't in path
    // For now, we'll let client.db() without args pick the default if not found.
    // Or, you could throw an error or specify a default app DB name here.
    console.warn("Database name not found in MONGODB_URI path, will use default database from connection.");
    return undefined; // Let client.db() use the default from connection string if possible
  } catch (error) {
    console.error("Could not parse database name from MONGODB_URI", error);
    return undefined; // Or throw error
  }
}


if (import.meta.env.MODE === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  // @ts-ignore
  if (!global._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI);
    // @ts-ignore
    global._mongoClientPromise = client.connect();
  }
  // @ts-ignore
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();
}

export async function connectToDatabase() {
  try {
    const connectedClient = await clientPromise;
    const dbName = getDbNameFromUri(MONGODB_URI);
    const db = connectedClient.db(dbName); // if dbName is undefined, it uses the default DB from URI
    return { db, client: connectedClient };
  } catch (e) {
    console.error("Failed to connect to MongoDB", e);
    throw new Error("Failed to connect to MongoDB");
  }
}