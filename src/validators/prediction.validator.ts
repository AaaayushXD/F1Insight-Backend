import { z } from 'zod';

export const predictSingleSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    season: z.string().regex(/^\d{4}$/, 'Season must be a 4-digit year'),
    round: z.string().regex(/^\d{1,2}$/, 'Round must be a number'),
    driverId: z.string().min(1, 'Driver ID is required'),
  }),
  params: z.object({}).optional(),
});

export const predictRaceSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    season: z.string().regex(/^\d{4}$/, 'Season must be a 4-digit year'),
    round: z.string().regex(/^\d{1,2}$/, 'Round must be a number'),
  }),
  params: z.object({}).optional(),
});

export const strategySchema = z.object({
  body: z.object({
    predictedPositionMean: z.number().min(1).max(20),
    predictedPositionStd: z.number().min(0).max(10).optional(),
    pitLossSec: z.number().min(10).max(40).optional(),
    nSimulations: z.number().int().min(100).max(10000).optional(),
    circuitId: z.string().optional(),
    raceLaps: z.number().int().min(10).max(100).optional(),
    trackTemp: z.number().optional(),
    airTemp: z.number().optional(),
    humidity: z.number().min(0).max(100).optional(),
    rainProbability: z.number().min(0).max(1).optional(),
    isWetRace: z.boolean().optional(),
    gapToCarAhead: z.number().min(0).optional(),
    gapToCarBehind: z.number().min(0).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const predictionHistorySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    season: z.string().regex(/^\d{4}$/).optional(),
  }),
  params: z.object({}).optional(),
});
