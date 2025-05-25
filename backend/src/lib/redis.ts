import Redis, { RedisOptions } from "ioredis";
import { REDIS_URI } from "../secrets";
import logger from "./logger";

const redisOptions: RedisOptions = {
  family: 4,
  // timeouts & retries
  connectTimeout: 10000,
  lazyConnect: true,
  keepAlive: 30000,
  enableReadyCheck: true,
  // (exponential backoff)
  retryStrategy: (times: number) => Math.min(times * 100, 2000),
}


export function createQueueConnection(): Redis {
  return new Redis(REDIS_URI, {
    ...redisOptions,
    maxRetriesPerRequest: null,
  });
}

class RedisManager {
  private static instance: RedisManager;
  private redis: Redis;
  private isConnected = false;

  private constructor() {
    this.redis = new Redis(REDIS_URI, {
      ...redisOptions,
      commandTimeout: 5000,
      maxRetriesPerRequest: 3,
    });

    this.setupEventHandlers();
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Redis connection established');
    });

    this.redis.on('ready', () => {
      this.isConnected = true;
      logger.info('Redis connection ready');
    });

    this.redis.on('error', (error: Error) => {
      this.isConnected = false;
      logger.error('Redis connection error', error.message);
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });

    this.redis.on('reconnecting', (delay: number) => {
      logger.info(`Redis reconnecting in ${delay}ms`);
    });

    this.redis.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis connection ended');
    });
  }

  /**
   * Returns the underlying Redis client instance.
   */
  public getConnection(): Redis {
    return this.redis;
  }

  /**
   * Connects to Redis if not already connecting or connected.
   */
  public async connect(): Promise<void> {
    const status = this.redis.status;
    if (['connecting', 'connect', 'ready'].includes(status)) {
      this.isConnected = status === 'ready';
      return;
    }

    try {
      await this.redis.connect();
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('connecting') || msg.includes('connected')) {
        return;
      }
      logger.error('Failed to connect to Redis', msg);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.redis.quit();
      this.isConnected = false;
      logger.info('Redis connection closed gracefully');
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }

  // Common operations
  public async setWithExpiry(key: string, value: string, ttl: number): Promise<void> {
    await this.redis.set(key, value, 'EX', ttl);
  }

  public async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  public async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }
}

const redisManager = RedisManager.getInstance();
export default redisManager;
export { redisManager };
