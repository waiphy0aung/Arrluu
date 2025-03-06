import dotenv from "dotenv"
dotenv.config()

export const MONGODB_URI: string = process.env.MONGODB_URI!;

export const PORT = process.env.PORT
