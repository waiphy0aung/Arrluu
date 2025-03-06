import dotenv from "dotenv"
dotenv.config()

export const NODE_ENV = process.env.NODE_ENV || 'development'

export const MONGODB_URI: string = process.env.MONGODB_URI!;

export const PORT = process.env.PORT

export const JWT_SECRET: string = process.env.JWT_SECRET || 'suckmydick'
