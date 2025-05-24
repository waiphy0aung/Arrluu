import mongoose from "mongoose";
import { MONGODB_URI } from "../secrets";
import logger from "./logger";

export const connectDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await mongoose.connect(MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      logger.success(`Database connected: ${conn.connection.host}`);
      return;
    } catch (err) {
      logger.error(`Database connection attempt ${i + 1} failed: ${err}`);
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};
