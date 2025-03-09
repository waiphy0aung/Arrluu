console.clear()
import express from "express";
import routes from "./routes";
import {PORT} from "./secrets";
import {connectDB} from "./lib/db";
import {errorMiddleware} from "./middlewares/error.middleware";
import cookieParser from "cookie-parser"
import logger from "./lib/logger";
import cors from "cors"
import {app,server} from "./lib/socket";

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(cookieParser())
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}))

app.use("/api", routes);
app.use(errorMiddleware)

server.listen(PORT, () => {
  logger.success(`Server is listening on port: ${PORT}`);
  connectDB()
});
