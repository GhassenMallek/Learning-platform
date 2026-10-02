import mongoose from 'mongoose';

/** Fail fast with a helpful message when there is no MongoDB to test against. */
export default async function setup() {
  const uri = process.env.MONGODB_URI_TEST ?? 'mongodb://127.0.0.1:27017/learning_center_test';
  try {
    const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 4000 }).asPromise();
    await conn.close();
  } catch {
    throw new Error(
      `Cannot reach MongoDB at ${uri}.\nStart mongod (e.g. "brew services start mongodb-community") or set MONGODB_URI_TEST.`,
    );
  }
}
