import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { redisManager } from "../lib/redis";
import { messageQueueManager } from "../lib/queue";
import logger from "../lib/logger";

const healthRoutes = Router();

interface ServiceHealth {
  status: "healthy" | "unhealthy";
  responseTime: number;
  details?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    messageQueue: ServiceHealth;
  };
  version: string;
  environment: string;
}

// Health check with timeout
async function checkWithTimeout<T>(
  checkFn: () => Promise<T>,
  timeoutMs: number = 5000
): Promise<{ success: boolean; data?: T; responseTime: number }> {
  const startTime = Date.now();
  
  try {
    const result = await Promise.race([
      checkFn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      )
    ]);

    return {
      success: true,
      data: result,
      responseTime: Date.now() - startTime
    };
  } catch {
    return {
      success: false,
      responseTime: Date.now() - startTime
    };
  }
}

// Database health check
async function checkDatabase(): Promise<ServiceHealth> {
  const result = await checkWithTimeout(async () => {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Not connected');
    }
    await mongoose.connection.db?.admin().ping();
    return true;
  });

  return {
    status: result.success ? "healthy" : "unhealthy",
    responseTime: result.responseTime,
    details: result.success ? "Connected" : "Connection failed"
  };
}

// Redis health check
async function checkRedis(): Promise<ServiceHealth> {
  const result = await checkWithTimeout(async () => {
    return await redisManager.healthCheck();
  });

  return {
    status: result.success && result.data ? "healthy" : "unhealthy",
    responseTime: result.responseTime,
    details: result.success ? "Connected" : "Connection failed"
  };
}

// Message queue health check
async function checkMessageQueue(): Promise<ServiceHealth> {
  const result = await checkWithTimeout(async () => {
    return await messageQueueManager.healthCheck();
  });

  return {
    status: result.success && result.data ? "healthy" : "unhealthy",
    responseTime: result.responseTime,
    details: result.success ? "Queue operational" : "Queue unavailable"
  };
}

// Main health endpoint
healthRoutes.get("/", async (req: Request, res: Response) => {
  try {
    const [database, redis, messageQueue] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkMessageQueue()
    ]);

    const services = { database, redis, messageQueue };
    const unhealthyCount = Object.values(services).filter(s => s.status === "unhealthy").length;
    
    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (unhealthyCount > 0) {
      overallStatus = unhealthyCount >= 2 ? "unhealthy" : "degraded";
    }

    const healthResponse: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
      version: process.env.npm_package_version || "unknown",
      environment: process.env.NODE_ENV || "development"
    };

    const statusCode = overallStatus === "healthy" ? 200 : 
      overallStatus === "degraded" ? 200 : 503;

    res.status(statusCode).json(healthResponse);

  } catch (error: any) {
    logger.error("Health check failed", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed"
    });
  }
});

// Individual service health checks
healthRoutes.get("/database", async (req: Request, res: Response) => {
  const health = await checkDatabase();
  res.status(health.status === "healthy" ? 200 : 503).json(health);
});

healthRoutes.get("/redis", async (req: Request, res: Response) => {
  const health = await checkRedis();
  res.status(health.status === "healthy" ? 200 : 503).json(health);
});

healthRoutes.get("/queue", async (req: Request, res: Response) => {
  const health = await checkMessageQueue();
  res.status(health.status === "healthy" ? 200 : 503).json(health);
});

// Simple liveness probe
healthRoutes.get("/live", (req: Request, res: Response) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Readiness probe
healthRoutes.get("/ready", async (req: Request, res: Response) => {
  try {
    const [dbHealth, redisHealth] = await Promise.all([
      checkDatabase(),
      checkRedis()
    ]);

    const isReady = dbHealth.status === "healthy" && redisHealth.status === "healthy";

    res.status(isReady ? 200 : 503).json({
      ready: isReady,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth.status,
        redis: redisHealth.status
      }
    });
  } catch {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString()
    });
  }
});

export default healthRoutes;
