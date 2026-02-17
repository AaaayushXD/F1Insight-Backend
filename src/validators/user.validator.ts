import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    avatar: z.string().nullable().optional(),
    favoriteDriver: z.string().nullable().optional(),
    favoriteTeam: z.string().nullable().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updatePreferencesSchema = z.object({
  body: z.object({
    theme: z.enum(['dark', 'light', 'system']).optional(),
    raceAlerts: z.boolean().optional(),
    qualifyingAlerts: z.boolean().optional(),
    predictionAlerts: z.boolean().optional(),
    driverNewsAlerts: z.boolean().optional(),
    twoFactorEnabled: z.boolean().optional(),
    sessionTimeout: z.number().int().min(5).max(120).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain number')
      .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
