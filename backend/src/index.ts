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
import { messageQueueManager } from "./lib/queue";
import { redisManager } from "./lib/redis";
import { securityHeaders } from "./middlewares/security.middleware";

// Middleware setup
app.use(securityHeaders)
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: NODE_ENV === "production"
      ? process.env.FRONTEND_URL || "https://yourdomain.com"
      : "http://localhost:5173",
    credentials: true,
  })
);

// Routes
app.use("/api", routes);
app.use(errorMiddleware);

// Serve static files in production
if (NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../../frontend/dist")));
  app.get("*", (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "../../frontend", "dist", "index.html"));
  });
}

// Graceful startup
async function startServer() {
  try {
    // Initialize connections
    await redisManager.connect();
    await connectDB();

    // Start server
    server.listen(PORT, () => {
      logger.success(`Server is listening on port: ${PORT}`);
      logger.info(`Environment: ${NODE_ENV}`);
    });

  } catch (error: any) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: 'SIGINT' | 'SIGTERM' | 'uncaughtException' | 'unhandledRejection') {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close server
    server.close(() => {
      logger.info('HTTP server closed');
    });

    await messageQueueManager.close();

    await redisManager.disconnect();

    logger.success('Graceful shutdown completed');
    process.exit(0);
  } catch (error: any) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on("SIGINT", () => gracefulShutdown('SIGINT'));
process.on("SIGTERM", () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  gracefulShutdown('unhandledRejection');
});

startServer();
