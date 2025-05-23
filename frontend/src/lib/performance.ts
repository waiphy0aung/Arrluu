interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 100;

  startTimer(name: string): () => void {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.addMetric(name, duration);

      if (duration > 100) { // Log slow operations
        console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  private addMetric(name: string, duration: number): void {
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now()
    });

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getAverageTime(operationName: string): number {
    const operations = this.metrics.filter(m => m.name === operationName);
    if (operations.length === 0) return 0;

    const total = operations.reduce((sum, op) => sum + op.duration, 0);
    return total / operations.length;
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Usage in crypto operations
export async function timedCryptoOperation<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const endTimer = performanceMonitor.startTimer(name);
  try {
    const result = await operation();
    return result;
  } finally {
    endTimer();
  }
}
