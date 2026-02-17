// This file runs BEFORE any test module is loaded
// Sets all required environment variables for the test suite

process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/f1insight-test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-minimum-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-minimum-32-characters';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.OTP_EXPIRY_MINUTES = '5';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.EMAIL_FROM = 'test@f1insight.com';
process.env.ML_SERVICE_URL = 'http://localhost:8000';
process.env.ERGAST_BASE_URL = 'https://api.jolpi.ca/ergast/f1';
process.env.FRONTEND_URL = 'http://localhost:5173';
