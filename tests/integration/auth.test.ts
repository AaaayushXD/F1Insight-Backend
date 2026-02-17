import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { User } from '../../src/models/User';
import { OTP } from '../../src/models/OTP';
import { hashPassword } from '../../src/utils/hash';

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
});

// Mock email service to prevent actual email sending
jest.mock('../../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  buildOTPEmail: jest.fn().mockReturnValue('<p>OTP</p>'),
  buildWelcomeEmail: jest.fn().mockReturnValue('<p>Welcome</p>'),
}));

describe('Auth Endpoints', () => {
  const validUser = {
    email: 'test@example.com',
    password: 'StrongP@ss1',
    name: 'Test User',
  };

  describe('POST /api/auth/signup', () => {
    it('creates a new user and returns 201', async () => {
      const res = await request(app).post('/api/auth/signup').send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBeDefined();
      expect(res.body.data.message).toContain('verify');
    });

    it('returns 409 for duplicate verified email', async () => {
      await User.create({
        email: validUser.email,
        password: await hashPassword(validUser.password),
        name: validUser.name,
        isVerified: true,
      });

      const res = await request(app).post('/api/auth/signup').send(validUser);
      expect(res.status).toBe(409);
    });

    it('returns 400 for invalid email', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        ...validUser,
        email: 'not-an-email',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for weak password', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        ...validUser,
        password: '12345',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing name', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        email: validUser.email,
        password: validUser.password,
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/verify', () => {
    it('verifies OTP and returns tokens', async () => {
      const user = await User.create({
        email: validUser.email,
        password: await hashPassword(validUser.password),
        name: validUser.name,
        isVerified: false,
      });

      const plainCode = '123456';
      const hashedCode = await hashPassword(plainCode);
      await OTP.create({
        userId: user._id,
        email: user.email,
        code: hashedCode,
        purpose: 'signup',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const res = await request(app).post('/api/auth/verify').send({
        userId: user._id.toString(),
        code: plainCode,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(validUser.email);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('returns 400 for invalid OTP', async () => {
      const user = await User.create({
        email: validUser.email,
        password: await hashPassword(validUser.password),
        name: validUser.name,
        isVerified: false,
      });

      const hashedCode = await hashPassword('123456');
      await OTP.create({
        userId: user._id,
        email: user.email,
        code: hashedCode,
        purpose: 'signup',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const res = await request(app).post('/api/auth/verify').send({
        userId: user._id.toString(),
        code: '000000',
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for non-6-digit code', async () => {
      const res = await request(app).post('/api/auth/verify').send({
        userId: new mongoose.Types.ObjectId().toString(),
        code: '12345',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns tokens for valid verified user', async () => {
      await User.create({
        email: validUser.email,
        password: await hashPassword(validUser.password),
        name: validUser.name,
        isVerified: true,
      });

      const res = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(validUser.email);
      expect(res.body.data.user.role).toBe('user');
    });

    it('returns 401 for wrong password', async () => {
      await User.create({
        email: validUser.email,
        password: await hashPassword(validUser.password),
        name: validUser.name,
        isVerified: true,
      });

      const res = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: 'WrongP@ss1',
      });

      expect(res.status).toBe(401);
    });

    it('returns 401 for non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@example.com',
        password: 'SomeP@ss1',
      });

      expect(res.status).toBe(401);
    });

    it('returns 403 for unverified user', async () => {
      await User.create({
        email: validUser.email,
        password: await hashPassword(validUser.password),
        name: validUser.name,
        isVerified: false,
      });

      const res = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });

      expect(res.status).toBe(403);
      expect(res.body.data.requiresOTP).toBe(true);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('returns new access token with valid refresh cookie', async () => {
      await User.create({
        email: validUser.email,
        password: await hashPassword(validUser.password),
        name: validUser.name,
        isVerified: true,
      });

      const loginRes = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });

      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('returns 401 without refresh cookie', async () => {
      const res = await request(app).post('/api/auth/refresh');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('logs out and clears cookie', async () => {
      await User.create({
        email: validUser.email,
        password: await hashPassword(validUser.password),
        name: validUser.name,
        isVerified: true,
      });

      const loginRes = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });

      const accessToken = loginRes.body.data.accessToken;
      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Logged out');
    });

    it('returns 401 without access token', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/health', () => {
    it('returns healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.mongodb).toBe('connected');
    });
  });
});
