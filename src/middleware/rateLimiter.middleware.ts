import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisService } from '../config/redis';
import { logger } from '../utils/logger';

const isTest = process.env.NODE_ENV === 'test';
const skip = isTest ? () => true : undefined;

// Helper to create a Redis store with a specific prefix
const createStore = (prefix: string) => {
  const service = getRedisService();
  const redis = service?.getClient();
  
  // Use memory store for tests or if Redis is not initialized or in mock state
  if (isTest || !redis || (redis as any).status === 'mock' || service?.status === 'ready' === false) {
    if (!isTest && (!redis || (redis as any).status === 'mock')) {
       return undefined;
    }
    if (isTest) return undefined;
  }
  
  try {
    return new RedisStore({
      // @ts-expect-error - ioredis type mismatch with express-rate-limit-redis
      sendCommand: (...args: string[]) => redis.call(...args),
      prefix: `rl:${prefix}:`,
    });
  } catch (error) {
    logger.error(`Failed to create RedisStore for ${prefix}`, { error });
    return undefined; // Fallback to memory
  }
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  store: createStore('global'),
  message: { success: false, message: 'Too many requests, please try again later' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  store: createStore('auth'),
  message: { success: false, message: 'Too many authentication attempts, please try again later' },
});

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  store: createStore('otp'),
  message: { success: false, message: 'Too many OTP requests, please try again later' },
});

export const predictionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  store: createStore('prediction'),
  message: { success: false, message: 'Prediction rate limit reached, please try again later' },
});
