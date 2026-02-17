import { Router } from 'express';
import * as f1Controller from '../controllers/f1.controller';
import { validate } from '../middleware/validate.middleware';
import { yearParamSchema, circuitParamSchema, raceResultParamSchema } from '../validators/f1.validator';

const router = Router();

/**
 * @swagger
 * /api/f1/seasons:
 *   get:
 *     summary: List all available F1 seasons
 *     tags: [F1 Data]
 *     responses:
 *       200:
 *         description: List of seasons
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
 *                     total:
 *                       type: number
 *                     seasons:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/seasons', f1Controller.getSeasons);

/**
 * @swagger
 * /api/f1/{year}/schedule:
 *   get:
 *     summary: Get race calendar for a season
 *     tags: [F1 Data]
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}$'
 *         example: "2024"
 *     responses:
 *       200:
 *         description: Race schedule
 */
router.get('/:year/schedule', validate(yearParamSchema), f1Controller.getSchedule);

/**
 * @swagger
 * /api/f1/{year}/drivers:
 *   get:
 *     summary: Get driver list for a season
 *     tags: [F1 Data]
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Driver list
 */
router.get('/:year/drivers', validate(yearParamSchema), f1Controller.getDrivers);

/**
 * @swagger
 * /api/f1/{year}/constructors:
 *   get:
 *     summary: Get constructor list for a season
 *     tags: [F1 Data]
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Constructor list
 */
router.get('/:year/constructors', validate(yearParamSchema), f1Controller.getConstructors);

/**
 * @swagger
 * /api/f1/{year}/circuits:
 *   get:
 *     summary: Get circuit list for a season
 *     tags: [F1 Data]
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Circuit list
 */
router.get('/:year/circuits', validate(yearParamSchema), f1Controller.getCircuits);

/**
 * @swagger
 * /api/f1/circuits/{circuitId}:
 *   get:
 *     summary: Get single circuit details
 *     tags: [F1 Data]
 *     parameters:
 *       - in: path
 *         name: circuitId
 *         required: true
 *         schema:
 *           type: string
 *         example: "monza"
 *     responses:
 *       200:
 *         description: Circuit details
 *       404:
 *         description: Circuit not found
 */
router.get('/circuits/:circuitId', validate(circuitParamSchema), f1Controller.getCircuitById);

/**
 * @swagger
 * /api/f1/current/last/results:
 *   get:
 *     summary: Get most recent race results
 *     tags: [F1 Data]
 *     responses:
 *       200:
 *         description: Last race results
 */
router.get('/current/last/results', f1Controller.getLastRaceResults);

/**
 * @swagger
 * /api/f1/{year}/{round}/results:
 *   get:
 *     summary: Get race results for a specific round
 *     tags: [F1 Data]
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: round
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Race results
 *       404:
 *         description: Results not found
 */
router.get('/:year/:round/results', validate(raceResultParamSchema), f1Controller.getRaceResults);

/**
 * @swagger
 * /api/f1/{year}/standings/drivers:
 *   get:
 *     summary: Get driver championship standings
 *     tags: [F1 Data]
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Driver standings
 */
router.get('/:year/standings/drivers', validate(yearParamSchema), f1Controller.getDriverStandings);

/**
 * @swagger
 * /api/f1/{year}/standings/constructors:
 *   get:
 *     summary: Get constructor championship standings
 *     tags: [F1 Data]
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Constructor standings
 */
router.get('/:year/standings/constructors', validate(yearParamSchema), f1Controller.getConstructorStandings);

export default router;
