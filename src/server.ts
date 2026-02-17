import { env } from './config/env';
import { connectDB } from './config/db';
import { logger } from './utils/logger';
import app from './app';

async function start(): Promise<void> {
  // 1. Connect to MongoDB
  await connectDB();

  // 2. Start Express server
  const PORT = parseInt(env.PORT);
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} [${env.NODE_ENV}]`);
    logger.info(`API docs available at http://localhost:${PORT}/api/docs`);
  });
}

start().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
