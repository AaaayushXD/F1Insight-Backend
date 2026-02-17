import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
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
 *         name: unreadOnly
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [race, prediction, driver, system]
 *     responses:
 *       200:
 *         description: Paginated notifications with unread count
 */
router.get('/', authenticate, notificationController.getNotifications);

/**
 * @swagger
 * /api/notifications/read-all:
 *   post:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All marked as read
 */
router.post('/read-all', authenticate, notificationController.markAllAsRead);

/**
 * @swagger
 * /api/notifications/clear:
 *   delete:
 *     summary: Clear all non-pinned notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Non-pinned notifications cleared
 */
router.delete('/clear', authenticate, notificationController.clearAll);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
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
 *         description: Notification updated
 */
router.patch('/:id/read', authenticate, notificationController.markAsRead);

/**
 * @swagger
 * /api/notifications/{id}/pin:
 *   patch:
 *     summary: Toggle pin on notification
 *     tags: [Notifications]
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
 *         description: Pin toggled
 */
router.patch('/:id/pin', authenticate, notificationController.togglePin);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
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
 *         description: Notification deleted
 */
router.delete('/:id', authenticate, notificationController.deleteNotification);

export default router;
