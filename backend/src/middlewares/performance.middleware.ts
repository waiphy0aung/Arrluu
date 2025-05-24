import { Request, Response, NextFunction } from "express";
import logger from "../lib/logger";

interface PerformanceMetrics {
  route: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000;

  addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow requests
    if (metric.responseTime > 1000) {
      logger.warn(`Slow request detected: ${metric.method} ${metric.route} took ${metric.responseTime}ms`);
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverageResponseTime(route?: string): number {
    const filteredMetrics = route
      ? this.metrics.filter(m => m.route === route)
      : this.metrics;

    if (filteredMetrics.length === 0) return 0;

    const total = filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0);
    return total / filteredMetrics.length;
  }
}

export const performanceMonitor = new PerformanceMonitor();

export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function(body) {
    const responseTime = Date.now() - startTime;

    performanceMonitor.addMetric({
      route: req.route?.path || req.path,
      method: req.method,
      responseTime,
      statusCode: res.statusCode,
      timestamp: Date.now()
    });

    return originalSend.call(this, body);
  };

  next();
};
