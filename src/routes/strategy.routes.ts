import { Router } from 'express';
import * as strategyController from '../controllers/strategy.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { predictionLimiter } from '../middleware/rateLimiter.middleware';
import { strategySchema } from '../validators/prediction.validator';

const router = Router();

/**
 * @swagger
 * /api/strategy/recommend:
 *   post:
 *     summary: Get race strategy recommendation via Monte Carlo simulation
 *     tags: [Strategy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [predictedPositionMean]
 *             properties:
 *               predictedPositionMean:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 20
 *                 example: 5
 *               predictedPositionStd:
 *                 type: number
 *                 default: 2.0
 *               pitLossSec:
 *                 type: number
 *                 default: 22.0
 *               nSimulations:
 *                 type: integer
 *                 default: 2000
 *               circuitId:
 *                 type: string
 *                 example: "monza"
 *               raceLaps:
 *                 type: integer
 *                 default: 56
 *               trackTemp:
 *                 type: number
 *               airTemp:
 *                 type: number
 *               humidity:
 *                 type: number
 *               rainProbability:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *               isWetRace:
 *                 type: boolean
 *               gapToCarAhead:
 *                 type: number
 *               gapToCarBehind:
 *                 type: number
 *     responses:
 *       200:
 *         description: Strategy recommendation
 *       503:
 *         description: ML service unavailable
 */
router.post('/recommend', authenticate, predictionLimiter, validate(strategySchema), strategyController.recommend);

/**
 * @swagger
 * /api/strategy/history:
 *   get:
 *     summary: Get user's strategy simulation history
 *     tags: [Strategy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Strategy history
 */
router.get('/history', authenticate, strategyController.getHistory);

export default router;
