import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Set env vars for test
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-minimum-32-characters';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-minimum-32-characters';
  process.env.JWT_ACCESS_EXPIRY = '15m';
  process.env.JWT_REFRESH_EXPIRY = '7d';
  process.env.PORT = '5001';
  process.env.OTP_EXPIRY_MINUTES = '5';
  process.env.SMTP_HOST = 'smtp.test.com';
  process.env.SMTP_PORT = '587';
  process.env.EMAIL_FROM = 'test@f1insight.com';
  process.env.ML_SERVICE_URL = 'http://localhost:8000';
  process.env.ERGAST_BASE_URL = 'https://api.jolpi.ca/ergast/f1';
  process.env.FRONTEND_URL = 'http://localhost:5173';

  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
