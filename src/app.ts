import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import { corsOptions } from './config/cors';
import { swaggerSpec } from './config/swagger';
import { globalLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import { logger } from './utils/logger';

import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';
import f1Routes from './routes/f1.routes';
import predictionRoutes from './routes/prediction.routes';
import strategyRoutes from './routes/strategy.routes';
import userRoutes from './routes/user.routes';
import notificationRoutes from './routes/notification.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

// --- Security ---
app.use(helmet());
app.use(cors(corsOptions));

// --- Parsing ---
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());

// --- Rate Limiting ---
// app.use('/api/', globalLimiter);

// --- Request Logging ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${Date.now() - start}ms`,
      ip: req.ip,
    });
  });
  next();
});

// --- API Documentation ---
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'F1Insight API Docs',
}));
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// --- Routes ---
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/f1', f1Routes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/strategy', strategyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// --- Root ---
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'F1Insight Backend API',
    docs: '/api/docs',
  });
});

// --- 404 ---
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// --- Error Handler ---
app.use(errorHandler);

export default app;
