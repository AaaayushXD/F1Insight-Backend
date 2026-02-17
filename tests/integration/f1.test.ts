import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { ApiError } from '../../src/utils/apiError';

jest.setTimeout(30000);

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000);

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
  jest.clearAllMocks();
});

jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  buildOTPEmail: jest.fn().mockReturnValue('<p>OTP</p>'),
  buildWelcomeEmail: jest.fn().mockReturnValue('<p>Welcome</p>'),
}));

jest.mock('../../src/services/f1.service', () => ({
  getSeasons: jest.fn(),
  getSchedule: jest.fn(),
  getDrivers: jest.fn(),
  getConstructors: jest.fn(),
  getCircuits: jest.fn(),
  getCircuitById: jest.fn(),
  getRaceResults: jest.fn(),
  getLastRaceResults: jest.fn(),
  getDriverStandings: jest.fn(),
  getConstructorStandings: jest.fn(),
}));

import * as f1Service from '../../src/services/f1.service';
const mockF1 = f1Service as jest.Mocked<typeof f1Service>;

describe('F1 Data Proxy Integration Tests', () => {
  describe('GET /api/f1/seasons', () => {
    it('should return seasons data', async () => {
      mockF1.getSeasons.mockResolvedValue({
        total: 2,
        seasons: [{ season: '2023' }, { season: '2024' }],
      });

      const res = await request(app).get('/api/f1/seasons');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.seasons).toHaveLength(2);
      expect(mockF1.getSeasons).toHaveBeenCalled();
    });
  });

  describe('GET /api/f1/:year/schedule', () => {
    it('should return schedule for a year', async () => {
      mockF1.getSchedule.mockResolvedValue({
        season: '2024',
        total: 2,
        races: [
          { round: '1', raceName: 'Bahrain Grand Prix', date: '2024-03-02' },
          { round: '2', raceName: 'Saudi Arabian Grand Prix', date: '2024-03-09' },
        ],
      });

      const res = await request(app).get('/api/f1/2024/schedule');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.races).toHaveLength(2);
      expect(mockF1.getSchedule).toHaveBeenCalledWith(2024);
    });
  });

  describe('GET /api/f1/:year/drivers', () => {
    it('should return drivers list', async () => {
      mockF1.getDrivers.mockResolvedValue({
        season: '2024',
        total: 2,
        drivers: [
          { driverId: 'max_verstappen', givenName: 'Max', familyName: 'Verstappen' },
          { driverId: 'hamilton', givenName: 'Lewis', familyName: 'Hamilton' },
        ],
      });

      const res = await request(app).get('/api/f1/2024/drivers');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.drivers).toHaveLength(2);
      expect(mockF1.getDrivers).toHaveBeenCalledWith(2024);
    });
  });

  describe('GET /api/f1/:year/constructors', () => {
    it('should return constructors list', async () => {
      mockF1.getConstructors.mockResolvedValue({
        season: '2024',
        total: 2,
        constructors: [
          { constructorId: 'red_bull', name: 'Red Bull Racing' },
          { constructorId: 'ferrari', name: 'Ferrari' },
        ],
      });

      const res = await request(app).get('/api/f1/2024/constructors');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.constructors).toHaveLength(2);
      expect(mockF1.getConstructors).toHaveBeenCalledWith(2024);
    });
  });

  describe('GET /api/f1/:year/circuits', () => {
    it('should return circuits list', async () => {
      mockF1.getCircuits.mockResolvedValue({
        season: '2024',
        total: 2,
        circuits: [
          { circuitId: 'bahrain', circuitName: 'Bahrain International Circuit' },
          { circuitId: 'jeddah', circuitName: 'Jeddah Corniche Circuit' },
        ],
      });

      const res = await request(app).get('/api/f1/2024/circuits');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.circuits).toHaveLength(2);
      expect(mockF1.getCircuits).toHaveBeenCalledWith(2024);
    });
  });

  describe('GET /api/f1/circuits/:circuitId', () => {
    it('should return circuit details', async () => {
      mockF1.getCircuitById.mockResolvedValue({
        circuitId: 'monaco',
        circuitName: 'Circuit de Monaco',
        Location: { locality: 'Monte-Carlo', country: 'Monaco' },
      });

      const res = await request(app).get('/api/f1/circuits/monaco');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.circuitId).toBe('monaco');
      expect(mockF1.getCircuitById).toHaveBeenCalledWith('monaco');
    });
  });

  describe('GET /api/f1/:year/:round/results', () => {
    it('should return race results', async () => {
      mockF1.getRaceResults.mockResolvedValue({
        season: '2024',
        round: '1',
        raceName: 'Bahrain Grand Prix',
        results: [{ position: '1', Driver: { driverId: 'max_verstappen' } }],
      });

      const res = await request(app).get('/api/f1/2024/1/results');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.season).toBe('2024');
      expect(mockF1.getRaceResults).toHaveBeenCalledWith(2024, 1);
    });
  });

  describe('GET /api/f1/current/last/results', () => {
    it('should return latest race results', async () => {
      mockF1.getLastRaceResults.mockResolvedValue({
        season: '2024',
        round: '5',
        raceName: 'Miami Grand Prix',
        results: [{ position: '1', Driver: { driverId: 'max_verstappen' } }],
      });

      const res = await request(app).get('/api/f1/current/last/results');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.season).toBe('2024');
      expect(mockF1.getLastRaceResults).toHaveBeenCalled();
    });
  });

  describe('GET /api/f1/:year/standings/drivers', () => {
    it('should return driver standings', async () => {
      mockF1.getDriverStandings.mockResolvedValue({
        season: '2024',
        standings: [
          { position: '1', points: '125', Driver: { driverId: 'max_verstappen' } },
          { position: '2', points: '98', Driver: { driverId: 'perez' } },
        ],
      });

      const res = await request(app).get('/api/f1/2024/standings/drivers');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.season).toBe('2024');
      expect(res.body.data.standings).toHaveLength(2);
      expect(mockF1.getDriverStandings).toHaveBeenCalledWith(2024);
    });
  });

  describe('GET /api/f1/:year/standings/constructors', () => {
    it('should return constructor standings', async () => {
      mockF1.getConstructorStandings.mockResolvedValue({
        season: '2024',
        standings: [
          { position: '1', points: '223', Constructor: { constructorId: 'red_bull' } },
          { position: '2', points: '156', Constructor: { constructorId: 'ferrari' } },
        ],
      });

      const res = await request(app).get('/api/f1/2024/standings/constructors');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.season).toBe('2024');
      expect(res.body.data.standings).toHaveLength(2);
      expect(mockF1.getConstructorStandings).toHaveBeenCalledWith(2024);
    });
  });

  describe('Error Handling', () => {
    it('should return 503 when service is unavailable', async () => {
      mockF1.getSeasons.mockRejectedValue(
        ApiError.serviceUnavailable('Ergast API is currently unavailable')
      );

      const res = await request(app).get('/api/f1/seasons');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
    });
  });
});
