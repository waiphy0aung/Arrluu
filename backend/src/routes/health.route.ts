import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import redisConnection from "../lib/redis";
import { performanceMonitor } from "../middlewares/performance.middleware";
import { messageQueue, messageWorker } from "../lib/queue";
import logger from "../lib/logger";

const healthRoutes = Router();

interface HealthStatus {
  status: "OK" | "DEGRADED" | "DOWN";
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    queue: ServiceStatus;
    worker: ServiceStatus;
  };
  performance: {
    averageResponseTime: number;
    totalRequests: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
  version: string;
  environment: string;
}

interface ServiceStatus {
  status: "connected" | "disconnected" | "degraded";
  details?: string;
  responseTime?: number;
  lastChecked: string;
}

// Helper function to check service with timeout
const checkServiceWithTimeout = async <T>(
  checkFn: () => Promise<T>,
  timeoutMs: number = 5000
): Promise<{ success: boolean; data?: T; error?: string; responseTime: number }> => {
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
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    };
  }
};

// Database health check
const checkDatabaseHealth = async (): Promise<ServiceStatus> => {
  const result = await checkServiceWithTimeout(async () => {
    // Check connection state
    if (mongoose.connection.readyState !== 1) {
      throw new Error(`Connection state: ${mongoose.connection.readyState}`);
    }

    // Perform a simple query to verify database is responsive
    await mongoose.connection.db?.admin().ping();
    return true;
  });

  return {
    status: result.success ? "connected" : "disconnected",
    details: result.error || `Connected to: ${mongoose.connection.host}`,
    responseTime: result.responseTime,
    lastChecked: new Date().toISOString()
  };
};

// Redis health check
const checkRedisHealth = async (): Promise<ServiceStatus> => {
  const result = await checkServiceWithTimeout(async () => {
    const pingResult = await redisConnection.ping();
    if (pingResult !== 'PONG') {
      throw new Error(`Unexpected ping response: ${pingResult}`);
    }

    // Test basic read/write operations
    const testKey = 'health_check_test';
    const testValue = Date.now().toString();

    await redisConnection.setex(testKey, 10, testValue);
    const retrievedValue = await redisConnection.get(testKey);

    if (retrievedValue !== testValue) {
      throw new Error('Redis read/write test failed');
    }

    await redisConnection.del(testKey);
    return true;
  });

  return {
    status: result.success ? "connected" : "disconnected",
    details: result.error || "Redis operations working normally",
    responseTime: result.responseTime,
    lastChecked: new Date().toISOString()
  };
};

// Queue health check
const checkQueueHealth = async (): Promise<ServiceStatus> => {
  const result = await checkServiceWithTimeout(async () => {
    // Check if queue is accessible
    const waiting = await messageQueue.getWaiting();
    const active = await messageQueue.getActive();
    const completed = await messageQueue.getCompleted();
    const failed = await messageQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };
  });

  return {
    status: result.success ? "connected" : "disconnected",
    details: result.success
      ? `Queue stats: ${JSON.stringify(result.data)}`
      : result.error,
    responseTime: result.responseTime,
    lastChecked: new Date().toISOString()
  };
};

// Worker health check
const checkWorkerHealth = async (): Promise<ServiceStatus> => {
  const result = await checkServiceWithTimeout(async () => {
    // Check if worker is running and not paused
    const isPaused = await messageWorker.isPaused();
    const isRunning = await messageWorker.isRunning();

    if (isPaused) {
      throw new Error('Worker is paused');
    }

    if (!isRunning) {
      throw new Error('Worker is not running');
    }

    return { isPaused, isRunning };
  });

  return {
    status: result.success ? "connected" : "disconnected",
    details: result.success
      ? "Worker is running normally"
      : result.error,
    responseTime: result.responseTime,
    lastChecked: new Date().toISOString()
  };
};

// Main health check endpoint
healthRoutes.get("/", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Get initial system info
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Perform all health checks concurrently
    const [databaseStatus, redisStatus, queueStatus, workerStatus] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
      checkQueueHealth(),
      checkWorkerHealth()
    ]);

    // Determine overall status
    const services = {
      database: databaseStatus,
      redis: redisStatus,
      queue: queueStatus,
      worker: workerStatus
    };

    let overallStatus: "OK" | "DEGRADED" | "DOWN" = "OK";

    const disconnectedServices = Object.values(services).filter(
      service => service.status === "disconnected"
    );

    if (disconnectedServices.length > 0) {
      overallStatus = disconnectedServices.length >= 2 ? "DOWN" : "DEGRADED";
    }

    const healthCheck: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
      performance: {
        averageResponseTime: performanceMonitor.getAverageResponseTime(),
        totalRequests: performanceMonitor.getMetrics().length,
        memoryUsage,
        cpuUsage
      },
      version: process.env.npm_package_version || "unknown",
      environment: process.env.NODE_ENV || "development"
    };

    const responseTime = Date.now() - startTime;

    // Log health check results
    logger.info("Health check completed", {
      status: overallStatus,
      responseTime,
      services: Object.fromEntries(
        Object.entries(services).map(([key, value]) => [key, value.status])
      )
    });

    // Set appropriate HTTP status code
    const statusCode = overallStatus === "OK" ? 200 :
      overallStatus === "DEGRADED" ? 200 : 503;

    res.status(statusCode).json(healthCheck);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error("Health check failed", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });

    const failedHealthCheck: HealthStatus = {
      status: "DOWN",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: { status: "disconnected", details: "Health check failed", lastChecked: new Date().toISOString() },
        redis: { status: "disconnected", details: "Health check failed", lastChecked: new Date().toISOString() },
        queue: { status: "disconnected", details: "Health check failed", lastChecked: new Date().toISOString() },
        worker: { status: "disconnected", details: "Health check failed", lastChecked: new Date().toISOString() }
      },
      performance: {
        averageResponseTime: 0,
        totalRequests: 0,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      version: process.env.npm_package_version || "unknown",
      environment: process.env.NODE_ENV || "development"
    };

    res.status(503).json(failedHealthCheck);
  }
});

// Detailed health check endpoint for each service
healthRoutes.get("/database", async (req: Request, res: Response) => {
  const status = await checkDatabaseHealth();
  res.status(status.status === "connected" ? 200 : 503).json(status);
});

healthRoutes.get("/redis", async (req: Request, res: Response) => {
  const status = await checkRedisHealth();
  res.status(status.status === "connected" ? 200 : 503).json(status);
});

healthRoutes.get("/queue", async (req: Request, res: Response) => {
  const status = await checkQueueHealth();
  res.status(status.status === "connected" ? 200 : 503).json(status);
});

healthRoutes.get("/worker", async (req: Request, res: Response) => {
  const status = await checkWorkerHealth();
  res.status(status.status === "connected" ? 200 : 503).json(status);
});

// Readiness probe (for Kubernetes)
healthRoutes.get("/ready", async (req: Request, res: Response) => {
  try {
    const [dbStatus, redisStatus] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth()
    ]);

    const isReady = dbStatus.status === "connected" && redisStatus.status === "connected";

    res.status(isReady ? 200 : 503).json({
      ready: isReady,
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus.status,
        redis: redisStatus.status
      }
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness probe (for Kubernetes)
healthRoutes.get("/live", (req: Request, res: Response) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default healthRoutes;
