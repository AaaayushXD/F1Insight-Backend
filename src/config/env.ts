import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  MONGODB_URI: z.string().url().or(z.string().startsWith('mongodb')),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  OTP_EXPIRY_MINUTES: z.string().default('5'),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('F1Insight <noreply@f1insight.com>'),

  ML_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  ERGAST_BASE_URL: z.string().url().default('https://api.jolpi.ca/ergast/f1'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  ADMIN_EMAIL: z.string().optional().default(''),
  ADMIN_PASSWORD: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Environment validation failed:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
