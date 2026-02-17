import { z } from 'zod';

export const yearParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    year: z.string().regex(/^\d{4}$/, 'Year must be a 4-digit number'),
  }),
});

export const circuitParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    circuitId: z.string().min(1, 'Circuit ID is required'),
  }),
});

export const raceResultParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    year: z.string().regex(/^\d{4}$/, 'Year must be a 4-digit number'),
    round: z.string().regex(/^\d{1,2}$/, 'Round must be a number'),
  }),
});
