import { Router, Request, Response } from "express";
import { connectDB } from "../lib/db";
import redisConnection from "../lib/redis";
import { performanceMonitor } from "../middlewares/performance.middleware";

const healthRoutes = Router();

healthRoutes.get("/", async (req: Request, res: Response) => {
  const healthCheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: "unknown",
      redis: "unknown",
      queue: "unknown"
    },
    performance: {
      averageResponseTime: performanceMonitor.getAverageResponseTime(),
      totalRequests: performanceMonitor.getMetrics().length
    }
  };

  try {
    // Check database connection
    await connectDB();
    healthCheck.services.database = "connected";
  } catch (error) {
    healthCheck.services.database = "disconnected";
    healthCheck.status = "DEGRADED";
  }

  try {
    // Check Redis connection
    await redisConnection.ping();
    healthCheck.services.redis = "connected";
  } catch (error) {
    healthCheck.services.redis = "disconnected";
    healthCheck.status = "DEGRADED";
  }

  try {
    // Check queue connection
  } catch (error) {

  }

  res.status(200).json(healthCheck)
})

export default healthRoutes
