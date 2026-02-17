import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.middleware';
import {
  signupSchema,
  loginSchema,
  verifyOTPSchema,
  resendOTPSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: StrongP@ss1
 *               name:
 *                 type: string
 *                 example: Max Verstappen
 *     responses:
 *       201:
 *         description: Account created, OTP sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     message:
 *                       type: string
 *       409:
 *         description: Email already registered
 *       400:
 *         description: Validation failed
 */
router.post('/signup', authLimiter, validate(signupSchema), authController.signup);

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify email with OTP code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, code]
 *             properties:
 *               userId:
 *                 type: string
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified, tokens issued
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
 *                     user:
 *                       $ref: '#/components/schemas/UserPublic'
 *                     accessToken:
 *                       type: string
 *         headers:
 *           Set-Cookie:
 *             description: HttpOnly refresh token cookie
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid or expired OTP
 *       429:
 *         description: Max attempts exceeded
 */
router.post('/verify', validate(verifyOTPSchema), authController.verifyOTP);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
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
 *                     user:
 *                       $ref: '#/components/schemas/UserPublic'
 *                     accessToken:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Email not verified (OTP sent)
 */
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid or missing refresh token
 */
router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout and invalidate refresh token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Not authenticated
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent if email exists
 */
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, code, newPassword]
 *             properties:
 *               userId:
 *                 type: string
 *               code:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid OTP
 */
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, purpose]
 *             properties:
 *               userId:
 *                 type: string
 *               purpose:
 *                 type: string
 *                 enum: [signup, login, password-reset]
 *     responses:
 *       200:
 *         description: OTP sent
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/resend-otp', otpLimiter, validate(resendOTPSchema), authController.resendOTP);

export default router;
