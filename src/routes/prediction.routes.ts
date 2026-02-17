import { Router } from 'express';
import * as predictionController from '../controllers/prediction.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { predictionLimiter } from '../middleware/rateLimiter.middleware';
import { predictSingleSchema, predictRaceSchema, predictionHistorySchema } from '../validators/prediction.validator';

const router = Router();

/**
 * @swagger
 * /api/predictions/health:
 *   get:
 *     summary: Check ML prediction service status
 *     tags: [Predictions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ML service healthy
 *       503:
 *         description: ML service unavailable
 */
router.get('/health', authenticate, predictionController.checkMLHealth);

/**
 * @swagger
 * /api/predictions/single:
 *   get:
 *     summary: Predict finish position for a single driver
 *     tags: [Predictions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: season
 *         required: true
 *         schema:
 *           type: string
 *         example: "2024"
 *       - in: query
 *         name: round
 *         required: true
 *         schema:
 *           type: string
 *         example: "1"
 *       - in: query
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         example: "verstappen"
 *     responses:
 *       200:
 *         description: Prediction result
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
 *                     predictionId:
 *                       type: string
 *                     driverId:
 *                       type: string
 *                     predictedFinishPosition:
 *                       type: number
 *                     podiumProbability:
 *                       type: number
 *       503:
 *         description: ML service unavailable
 */
router.get('/single', authenticate, predictionLimiter, validate(predictSingleSchema), predictionController.predictSingle);

/**
 * @swagger
 * /api/predictions/race:
 *   get:
 *     summary: Predict full race grid positions
 *     tags: [Predictions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: season
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: round
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Full grid predictions
 */
router.get('/race', authenticate, predictionLimiter, validate(predictRaceSchema), predictionController.predictRace);

/**
 * @swagger
 * /api/predictions/history:
 *   get:
 *     summary: Get user's prediction history
 *     tags: [Predictions]
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
 *       - in: query
 *         name: season
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated prediction history
 */
router.get('/history', authenticate, validate(predictionHistorySchema), predictionController.getHistory);

/**
 * @swagger
 * /api/predictions/{id}:
 *   get:
 *     summary: Get specific prediction by ID
 *     tags: [Predictions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Prediction details
 *       404:
 *         description: Prediction not found
 */
router.get('/:id', authenticate, predictionController.getPredictionById);

export default router;
