import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend the NodeJS Global type to avoid TypeScript errors
declare global {
  var mongoose: MongooseCache;
}

// Set cached to the global mongoose object or a new empty object
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDb() {
  // If we have a cached connection, return it
  if (cached.conn) {
    return cached.conn;
  }

  // If there's no connection promise, create one
  if (!cached.promise) {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error(
        "Please define the MONGODB_URI environment variable inside .env.local"
      );
    }

    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false, // Disables Mongoose's buffering
      })
      .then((mongoose) => {
        return mongoose;
      });
  }

  try {
    // Wait for the connection promise to resolve and cache the connection
    cached.conn = await cached.promise;
  } catch (e) {
    // If the connection fails, clear the promise so we can try again
    cached.promise = null;
    throw e;
  }

  // Return the active connection
  return cached.conn;
}

export default connectToDb;
