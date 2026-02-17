import axios from 'axios';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

const mlClient = axios.create({
  baseURL: env.ML_SERVICE_URL,
  timeout: 30000, // 30s — strategy Monte Carlo can be slow
});

// --- Health ---

export async function checkHealth(): Promise<{ status: string }> {
  try {
    const response = await mlClient.get('/health');
    return response.data;
  } catch {
    throw ApiError.serviceUnavailable('ML prediction service is unavailable');
  }
}

// --- Single Driver Prediction ---

export async function predictSingle(season: number, round: number, driverId: string) {
  try {
    const response = await mlClient.get('/predict', {
      params: { season, round, driver_id: driverId },
    });
    return response.data;
  } catch (error) {
    handleMLError(error, 'single prediction');
  }
}

// --- Full Race Prediction ---

export async function predictRace(season: number, round: number) {
  try {
    const response = await mlClient.get('/api/predictions/race', {
      params: { season, round },
    });
    return response.data;
  } catch (error) {
    handleMLError(error, 'race prediction');
  }
}

// --- Strategy Recommendation ---

export interface StrategyParams {
  predictedPositionMean: number;
  predictedPositionStd?: number;
  pitLossSec?: number;
  nSimulations?: number;
  circuitId?: string;
  raceLaps?: number;
  trackTemp?: number;
  airTemp?: number;
  humidity?: number;
  rainProbability?: number;
  isWetRace?: boolean;
  gapToCarAhead?: number;
  gapToCarBehind?: number;
}

export async function getStrategy(params: StrategyParams) {
  try {
    const response = await mlClient.get('/strategy', {
      params: {
        predicted_position_mean: params.predictedPositionMean,
        predicted_position_std: params.predictedPositionStd ?? 2.0,
        pit_loss_sec: params.pitLossSec ?? 22.0,
        n_simulations: params.nSimulations ?? 2000,
        circuit_id: params.circuitId,
        race_laps: params.raceLaps ?? 56,
        track_temp: params.trackTemp,
        air_temp: params.airTemp,
        humidity: params.humidity,
        rain_probability: params.rainProbability ?? 0,
        is_wet_race: params.isWetRace ?? false,
        gap_to_car_ahead: params.gapToCarAhead,
        gap_to_car_behind: params.gapToCarBehind,
      },
    });
    return response.data;
  } catch (error) {
    handleMLError(error, 'strategy recommendation');
  }
}

// --- ML Data Access ---

export async function getMLSeasons() {
  try {
    const response = await mlClient.get('/api/seasons');
    return response.data;
  } catch (error) {
    handleMLError(error, 'seasons list');
  }
}

export async function getMLRaces(season: number) {
  try {
    const response = await mlClient.get('/api/races', { params: { season } });
    return response.data;
  } catch (error) {
    handleMLError(error, 'races list');
  }
}

export async function getMLDrivers(season?: number) {
  try {
    const response = await mlClient.get('/api/drivers', {
      params: season ? { season } : {},
    });
    return response.data;
  } catch (error) {
    handleMLError(error, 'drivers list');
  }
}

// --- Admin: Trigger Data Collection ---

export async function triggerDataCollection(startYear: number, endYear: number) {
  try {
    const response = await mlClient.get('/collect', {
      params: { start_year: startYear, end_year: endYear, include_laps: false },
      timeout: 300000, // 5 minutes — collection is very slow
    });
    return response.data;
  } catch (error) {
    handleMLError(error, 'data collection');
  }
}

// --- Error Handler ---

function handleMLError(error: unknown, context: string): never {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNREFUSED') {
      logger.error(`ML service connection refused during ${context}`);
      throw ApiError.serviceUnavailable('Prediction service is currently unavailable');
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      logger.error(`ML service timeout during ${context}`);
      throw ApiError.serviceUnavailable('Prediction service timed out');
    }
    if (error.response?.status === 422) {
      throw ApiError.badRequest(`Invalid parameters for ${context}`);
    }
    if (error.response?.status === 404) {
      throw ApiError.notFound(`Data not available for ${context}`);
    }
    logger.error(`ML service error during ${context}`, {
      status: error.response?.status,
      data: error.response?.data,
    });
  }
  throw ApiError.internal(`Prediction service error during ${context}`);
}
