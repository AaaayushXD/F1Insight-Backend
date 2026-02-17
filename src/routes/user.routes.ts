import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateProfileSchema, updatePreferencesSchema, changePasswordSchema } from '../validators/user.validator';

const router = Router();

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile with stats
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile with prediction stats
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
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                       nullable: true
 *                     favoriteDriver:
 *                       type: string
 *                       nullable: true
 *                     favoriteTeam:
 *                       type: string
 *                       nullable: true
 *                     preferences:
 *                       type: object
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalPredictions:
 *                           type: number
 *                         avgAccuracy:
 *                           type: number
 *                           nullable: true
 *                         memberSince:
 *                           type: string
 *                           format: date-time
 *                         lastLogin:
 *                           type: string
 *                           format: date-time
 */
router.get('/me', authenticate, userController.getProfile);

/**
 * @swagger
 * /api/users/me:
 *   patch:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 nullable: true
 *               favoriteDriver:
 *                 type: string
 *                 nullable: true
 *               favoriteTeam:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Updated profile
 */
router.patch('/me', authenticate, validate(updateProfileSchema), userController.updateProfile);

/**
 * @swagger
 * /api/users/me/preferences:
 *   patch:
 *     summary: Update user preferences
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme:
 *                 type: string
 *                 enum: [dark, light, system]
 *               raceAlerts:
 *                 type: boolean
 *               qualifyingAlerts:
 *                 type: boolean
 *               predictionAlerts:
 *                 type: boolean
 *               driverNewsAlerts:
 *                 type: boolean
 *               twoFactorEnabled:
 *                 type: boolean
 *               sessionTimeout:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated preferences
 */
router.patch('/me/preferences', authenticate, validate(updatePreferencesSchema), userController.updatePreferences);

/**
 * @swagger
 * /api/users/me/password:
 *   patch:
 *     summary: Change password
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Current password incorrect
 */
router.patch('/me/password', authenticate, validate(changePasswordSchema), userController.changePassword);

/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     summary: Delete own account (soft delete)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 */
router.delete('/me', authenticate, userController.deleteAccount);

export default router;
