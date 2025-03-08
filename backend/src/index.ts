console.clear()
import express from "express";
import routes from "./routes";
import {PORT} from "./secrets";
import {connectDB} from "./lib/db";
import {errorMiddleware} from "./middlewares/error.middleware";
import cookieParser from "cookie-parser"
import logger from "./lib/logger";
import cors from "cors"

const app = express();

app.use(express.json())
app.use(express.urlencoded())
app.use(cookieParser())
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}))

app.use("/api", routes);
app.use(errorMiddleware)

app.listen(PORT, () => {
  logger.success(`Server is listening on port: ${PORT}`);
  connectDB()
});
