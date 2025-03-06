import mongoose from "mongoose";
import {MONGODB_URI} from "../secrets";

export const connectDB = async () => {
  try{
    const conn = await mongoose.connect(MONGODB_URI)
    console.log(`Database connected: ${conn.connection.host}`)
  }catch(err){
    console.log(`Database connection error:`,err)
  }
}
