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
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  logger.success(`Server is listening on port: ${PORT}`);
  connectDB();
});
