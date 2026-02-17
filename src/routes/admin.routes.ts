import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { adminOnly, moderatorUp } from '../middleware/rbac.middleware';

const router = Router();

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List all users (paginated)
 *     tags: [Admin]
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, moderator, admin]
 *     responses:
 *       200:
 *         description: Paginated user list
 *       403:
 *         description: Admin only
 */
router.get('/users', authenticate, adminOnly, adminController.listUsers);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user details by ID
 *     tags: [Admin]
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
 *         description: User details with prediction count
 *       404:
 *         description: User not found
 */
router.get('/users/:id', authenticate, adminOnly, adminController.getUserById);

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   patch:
 *     summary: Update user role
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, moderator, admin]
 *     responses:
 *       200:
 *         description: Role updated
 */
router.patch('/users/:id/role', authenticate, adminOnly, adminController.updateUserRole);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Soft-delete a user
 *     tags: [Admin]
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
 *         description: User deleted
 */
router.delete('/users/:id', authenticate, adminOnly, adminController.deleteUser);

/**
 * @swagger
 * /api/admin/audit-logs:
 *   get:
 *     summary: View audit logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
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
 *         description: Audit log entries
 */
router.get('/audit-logs', authenticate, moderatorUp, adminController.getAuditLogs);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get system statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System stats (users, predictions, cache, ML service)
 */
router.get('/stats', authenticate, adminOnly, adminController.getSystemStats);

/**
 * @swagger
 * /api/admin/notifications/broadcast:
 *   post:
 *     summary: Send notification to all verified users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [race, prediction, driver, system]
 *     responses:
 *       200:
 *         description: Notification broadcast
 */
router.post('/notifications/broadcast', authenticate, moderatorUp, adminController.broadcastNotification);

/**
 * @swagger
 * /api/admin/ml/collect:
 *   post:
 *     summary: Trigger ML data collection
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startYear:
 *                 type: number
 *               endYear:
 *                 type: number
 *     responses:
 *       200:
 *         description: Collection triggered
 */
router.post('/ml/collect', authenticate, adminOnly, adminController.triggerMLCollection);

/**
 * @swagger
 * /api/admin/cache/flush:
 *   post:
 *     summary: Flush all cache
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache flushed
 */
router.post('/cache/flush', authenticate, adminOnly, adminController.flushCacheEndpoint);

export default router;
