import axios from 'axios';
import { env } from '../config/env';
import { getCached, setCache } from './cache.service';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

const ergastClient = axios.create({
  baseURL: env.ERGAST_BASE_URL,
  timeout: 15000,
});

const currentYear = new Date().getFullYear();

// Cache TTLs in seconds
const TTL = {
  HISTORICAL: 86400,      // 24 hours — past season data never changes
  CURRENT_SCHEDULE: 3600,  // 1 hour — schedule can update mid-season
  RESULTS: 21600,          // 6 hours — results are final once published
  DRIVERS: 21600,          // 6 hours — rarely changes mid-season
  CONSTRUCTORS: 21600,     // 6 hours
  CIRCUITS: 86400,         // 24 hours — static data
  STANDINGS: 3600,         // 1 hour — updates after each race
};

function getTTL(category: keyof typeof TTL, year: number): number {
  // Historical data gets longer TTL
  if (year < currentYear) return TTL.HISTORICAL;
  return TTL[category];
}

async function fetchErgast(path: string): Promise<any> {
  try {
    const response = await ergastClient.get(`${path}.json?limit=100`);
    return response.data.MRData;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw ApiError.serviceUnavailable('F1 data service is temporarily unavailable');
      }
      if (error.response?.status === 404) {
        throw ApiError.notFound('F1 data not found');
      }
    }
    logger.error('Ergast API error', { path, error });
    throw ApiError.internal('Failed to fetch F1 data');
  }
}

// --- Schedule / Races ---

export async function getSchedule(year: number) {
  const cacheKey = `f1:schedule:${year}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchErgast(`/${year}`);
  const races = data.RaceTable?.Races || [];

  const result = {
    season: data.RaceTable?.season || String(year),
    total: races.length,
    races: races.map(transformRace),
  };

  setCache(cacheKey, result, getTTL('CURRENT_SCHEDULE', year));
  return result;
}

// --- Drivers ---

export async function getDrivers(year: number) {
  const cacheKey = `f1:drivers:${year}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchErgast(`/${year}/drivers`);
  const drivers = data.DriverTable?.Drivers || [];

  const result = {
    season: data.DriverTable?.season || String(year),
    total: drivers.length,
    drivers,
  };

  setCache(cacheKey, result, getTTL('DRIVERS', year));
  return result;
}

// --- Constructors ---

export async function getConstructors(year: number) {
  const cacheKey = `f1:constructors:${year}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchErgast(`/${year}/constructors`);
  const constructors = data.ConstructorTable?.Constructors || [];

  const result = {
    season: data.ConstructorTable?.season || String(year),
    total: constructors.length,
    constructors,
  };

  setCache(cacheKey, result, getTTL('CONSTRUCTORS', year));
  return result;
}

// --- Circuits ---

export async function getCircuits(year: number) {
  const cacheKey = `f1:circuits:${year}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchErgast(`/${year}/circuits`);
  const circuits = data.CircuitTable?.Circuits || [];

  const result = {
    season: data.CircuitTable?.season || String(year),
    total: circuits.length,
    circuits,
  };

  setCache(cacheKey, result, getTTL('CIRCUITS', year));
  return result;
}

export async function getCircuitById(circuitId: string) {
  const cacheKey = `f1:circuit:${circuitId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchErgast(`/circuits/${circuitId}`);
  const circuits = data.CircuitTable?.Circuits || [];

  if (circuits.length === 0) {
    throw ApiError.notFound(`Circuit '${circuitId}' not found`);
  }

  const result = circuits[0];
  setCache(cacheKey, result, TTL.CIRCUITS);
  return result;
}

// --- Race Results ---

export async function getRaceResults(year: number, round: number) {
  const cacheKey = `f1:results:${year}:${round}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchErgast(`/${year}/${round}/results`);
  const races = data.RaceTable?.Races || [];

  if (races.length === 0) {
    throw ApiError.notFound(`Results for ${year} round ${round} not found`);
  }

  const race = races[0];
  const result = {
    season: race.season,
    round: race.round,
    raceName: race.raceName,
    circuit: race.Circuit,
    date: race.date,
    time: race.time,
    results: race.Results || [],
  };

  setCache(cacheKey, result, getTTL('RESULTS', year));
  return result;
}

// --- Last Race Results ---

export async function getLastRaceResults() {
  const cacheKey = 'f1:results:last';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchErgast('/current/last/results');
  const races = data.RaceTable?.Races || [];

  if (races.length === 0) {
    throw ApiError.notFound('No recent race results found');
  }

  const race = races[0];
  const result = {
    season: race.season,
    round: race.round,
    raceName: race.raceName,
    circuit: race.Circuit,
    date: race.date,
    results: race.Results || [],
  };

  setCache(cacheKey, result, TTL.RESULTS);
  return result;
}

// --- Standings ---

export async function getDriverStandings(year: number) {
  const cacheKey = `f1:standings:drivers:${year}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchErgast(`/${year}/driverStandings`);
  const lists = data.StandingsTable?.StandingsLists || [];

  const result = {
    season: data.StandingsTable?.season || String(year),
    standings: lists.length > 0 ? lists[0].DriverStandings || [] : [],
  };

  setCache(cacheKey, result, getTTL('STANDINGS', year));
  return result;
}

export async function getConstructorStandings(year: number) {
  const cacheKey = `f1:standings:constructors:${year}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchErgast(`/${year}/constructorStandings`);
  const lists = data.StandingsTable?.StandingsLists || [];

  const result = {
    season: data.StandingsTable?.season || String(year),
    standings: lists.length > 0 ? lists[0].ConstructorStandings || [] : [],
  };

  setCache(cacheKey, result, getTTL('STANDINGS', year));
  return result;
}

// --- Seasons ---

export async function getSeasons() {
  const cacheKey = 'f1:seasons';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchErgast('/seasons');
  const seasons = data.SeasonTable?.Seasons || [];

  const result = {
    total: seasons.length,
    seasons,
  };

  setCache(cacheKey, result, TTL.HISTORICAL);
  return result;
}

// --- Transformers ---

function transformRace(race: any) {
  return {
    season: race.season,
    round: race.round,
    raceName: race.raceName,
    circuit: race.Circuit,
    date: race.date,
    time: race.time || null,
    firstPractice: race.FirstPractice || null,
    secondPractice: race.SecondPractice || null,
    thirdPractice: race.ThirdPractice || null,
    qualifying: race.Qualifying || null,
    sprint: race.Sprint || null,
  };
}
