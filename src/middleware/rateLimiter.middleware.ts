import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';
const skip = isTest ? () => true : undefined;

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { success: false, message: 'Too many requests, please try again later' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { success: false, message: 'Too many authentication attempts, please try again later' },
});

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { success: false, message: 'Too many OTP requests, please try again later' },
});

export const predictionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { success: false, message: 'Prediction rate limit reached, please try again later' },
});
