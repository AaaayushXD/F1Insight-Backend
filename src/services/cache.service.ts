import { getRedisService } from '../config/redis';
import { logger } from '../utils/logger';

export async function getCached<T>(key: string): Promise<T | undefined> {
  const redis = getRedisService()?.getClient();
  if (!redis) return undefined;

  try {
    const value = await redis.get(key);
    if (value) {
      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(value) as T;
    }
  } catch (error) {
    logger.error(`Error getting cache: ${key}`, { error });
  }
  return undefined;
}

export async function setCache<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  const redis = getRedisService()?.getClient();
  if (!redis) return;

  try {
    const serializedValue = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.set(key, serializedValue, 'EX', ttlSeconds);
    } else {
      await redis.set(key, serializedValue);
    }
    logger.debug(`Cache set: ${key} (TTL: ${ttlSeconds ?? 'none'}s)`);
  } catch (error) {
    logger.error(`Error setting cache: ${key}`, { error });
  }
}

export async function invalidateCache(key: string): Promise<void> {
  const redis = getRedisService()?.getClient();
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    logger.error(`Error invalidating cache: ${key}`, { error });
  }
}

export async function invalidateCachePattern(pattern: string): Promise<void> {
  const redis = getRedisService()?.getClient();
  if (!redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.debug(`Cache invalidated: ${keys.length} keys matching "${pattern}"`);
    }
  } catch (error) {
    logger.error(`Error invalidating cache pattern: ${pattern}`, { error });
  }
}

export async function getCacheStats() {
  const redis = getRedisService()?.getClient();
  if (!redis) return { info: 'not initialized' };
  const info = await redis.info();
  return { info };
}

export async function flushCache(): Promise<void> {
  const redis = getRedisService()?.getClient();
  if (!redis) return;

  try {
    await redis.flushall();
    logger.info('Cache flushed');
  } catch (error) {
    logger.error('Error flushing cache', { error });
  }
}

// Proxy default export to the client of the service
export default {
  get call() {
    return getRedisService()?.getClient().call.bind(getRedisService()?.getClient());
  },
  get status() {
    return getRedisService()?.getClient().status || 'not initialized';
  }
};
