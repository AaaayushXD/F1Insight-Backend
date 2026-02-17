import NodeCache from 'node-cache';
import { logger } from '../utils/logger';

const cache = new NodeCache({
  stdTTL: 3600,       // default 1 hour
  checkperiod: 120,   // check for expired every 2 min
  useClones: false,    // return reference (faster, avoid deep clone)
});

export function getCached<T>(key: string): T | undefined {
  const value = cache.get<T>(key);
  if (value !== undefined) {
    logger.debug(`Cache hit: ${key}`);
  }
  return value;
}

export function setCache<T>(key: string, value: T, ttlSeconds?: number): void {
  cache.set(key, value, ttlSeconds ?? 3600);
  logger.debug(`Cache set: ${key} (TTL: ${ttlSeconds ?? 3600}s)`);
}

export function invalidateCache(key: string): void {
  cache.del(key);
}

export function invalidateCachePattern(pattern: string): void {
  const keys = cache.keys().filter((k) => k.startsWith(pattern));
  if (keys.length > 0) {
    cache.del(keys);
    logger.debug(`Cache invalidated: ${keys.length} keys matching "${pattern}"`);
  }
}

export function getCacheStats() {
  return cache.getStats();
}

export function flushCache(): void {
  cache.flushAll();
  logger.info('Cache flushed');
}
