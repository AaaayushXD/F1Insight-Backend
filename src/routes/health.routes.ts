import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     uptime:
 *                       type: number
 *                     mongodb:
 *                       type: string
 *                     timestamp:
 *                       type: string
 */
router.get('/', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStates: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      mongodb: dbStates[dbState] || 'unknown',
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
