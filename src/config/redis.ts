import Redis from "ioredis";
import { logger } from "../utils/logger";

export class RedisService {
  private client: Redis;
  private subscriber: Redis;
  private connected = false;
  private onReconnectCallback: (() => void) | null = null;
  public status: string;

  constructor(url: string, options?: { db?: number }) {
    const isTest = process.env.NODE_ENV === 'test';
    const hasUrl = !!url;

    const redisOptions = {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 10) {
          logger.error("Redis: max reconnection attempts reached");
          return null;
        }
        const delay = Math.min(times * 200, 5000);
        logger.warn(`Redis: reconnecting in ${delay}ms (attempt ${times})`);
        return delay;
      },
      db: options?.db ?? 0,
    };

    if (!isTest && hasUrl) {
      this.client = new Redis(url, redisOptions);
      this.subscriber = this.client.duplicate();
      this.status = this.client.status;
    } else {
      // Mock implementation for tests or missing URL
      this.client = ({
        get: async () => null,
        set: async () => 'OK',
        del: async () => 0,
        keys: async () => [],
        flushall: async () => 'OK',
        info: async () => 'redis_version:mock',
        on: () => {},
        once: () => {},
        quit: async () => 'OK',
        call: async () => null,
        duplicate: () => this.client,
        status: 'ready',
      } as unknown as Redis);
      this.subscriber = this.client;
      this.status = 'ready';
    }

    this.connected = this.client.status === "ready";

    if (!isTest && hasUrl) {
      this.client.on("connect", () => {
        const wasDisconnected = !this.connected;
        this.connected = true;
        logger.info("Redis command client connected");
        if (wasDisconnected && this.onReconnectCallback) {
          this.onReconnectCallback();
        }
      });

      this.client.on("error", (err) => {
        this.connected = false;
        if (err.name === 'ReplyError' && err.message.includes('NOAUTH')) {
          logger.error('Redis Authentication failed: NOAUTH required.');
        } else {
          logger.error("Redis command client error", { error: err.message });
        }
      });

      this.client.on("close", () => {
        this.connected = false;
        logger.warn("Redis command client disconnected");
      });

      this.subscriber.on("error", (err) => {
        logger.error("Redis subscriber error", { error: err.message });
      });
    }
  }

  getClient(): Redis {
    return this.client;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  isConnected(): boolean {
    return this.connected && this.client.status === "ready";
  }

  async waitForConnection(timeoutMs = 5000): Promise<boolean> {
    if (this.isConnected()) return true;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), timeoutMs);
      this.client.once("ready", () => {
        clearTimeout(timeout);
        resolve(true);
      });
      this.client.once("error", () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  onReconnect(callback: () => void): void {
    this.onReconnectCallback = callback;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    await Promise.all([
      this.client.quit().catch(() => {}),
      this.subscriber.quit().catch(() => {}),
    ]);
    logger.info("Redis connections closed");
  }
}

let redisService: RedisService | null = null;

export const initializeRedis = (url: string, options?: { db?: number }): RedisService => {
  if (redisService) return redisService;
  redisService = new RedisService(url, options);
  return redisService;
};

export const getRedisService = (): RedisService | null => redisService;
