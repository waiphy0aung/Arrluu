console.clear()
import express from "express";
import routes from "./routes";
import {PORT} from "./secrets";
import {connectDB} from "./lib/db";
import {errorMiddleware} from "./middlewares/error.middleware";
import cookieParser from "cookie-parser"
import logger from "./lib/logger";

const app = express();

app.use(express.json())
app.use(express.urlencoded())
app.use(cookieParser())

app.use("/api", routes);
app.use(errorMiddleware)

app.listen(PORT, () => {
  logger.success(`Server is listening on port: ${PORT}`);
  connectDB()
});
