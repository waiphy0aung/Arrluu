import dotenv from "dotenv";
dotenv.config();

export const NODE_ENV = process.env.NODE_ENV || "development";

export const MONGODB_URI: string = process.env.MONGODB_URI!;

export const REDIS_URI: string = process.env.REDIS_URI!;

export const PORT = process.env.PORT;

export const JWT_SECRET: string = process.env.JWT_SECRET || "Huehuecanauhtlus";

export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
