import { z } from 'zod';

export const signupSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be at most 50 characters'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const verifyOTPSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required'),
    code: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const resendOTPSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required'),
    purpose: z.enum(['signup', 'login', 'password-reset']),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required'),
    code: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
