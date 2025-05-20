console.clear();
import express, { Request, Response } from "express";
import routes from "./routes";
import { NODE_ENV, PORT } from "./secrets";
import { connectDB } from "./lib/db";
import { errorMiddleware } from "./middlewares/error.middleware";
import cookieParser from "cookie-parser";
import logger from "./lib/logger";
import cors from "cors";
import path from "path";
import { app, server } from "./lib/socket";
import "./lib/queue"
import { messageQueue, messageWorker, queueEvents } from "./lib/queue";
import redisConnection from "./lib/redis";

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use("/api", routes);
app.use(errorMiddleware);

if (NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../../frontend/dist")));

  app.get("*", (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "../../frontend", "dist", "index.html"));
  });
}

async function startServer() {
  await queueEvents.waitUntilReady();
  server.listen(PORT, () => {
    logger.success(`Server is listening on port: ${PORT}`);
    connectDB();
  });
}

startServer();

process.on("SIGINT", async () => {
  logger.success("Shutting down gracefully...");
  await messageQueue.close();
  await messageWorker.close();
  await queueEvents.close();
  await redisConnection.quit();
  process.exit(0);
});
