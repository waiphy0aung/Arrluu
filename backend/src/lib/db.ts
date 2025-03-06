import mongoose from "mongoose";
import { MONGODB_URI } from "../secrets";
import logger from "./logger";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    logger.success(`Database connected: ${conn.connection.host}`);
  } catch (err) {
    logger.error(`Database connection error: ${err}`);
  }
};
