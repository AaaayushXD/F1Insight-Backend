import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/Notification';
import { ApiError } from '../utils/apiError';

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const unreadOnly = req.query.unreadOnly === 'true';
    const type = req.query.type as string | undefined;

    const query: Record<string, any> = { userId: req.user!.userId };
    if (unreadOnly) query.isRead = false;
    if (type) query.type = type;

    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const unreadCount = await Notification.countDocuments({ userId: req.user!.userId, isRead: false });

    res.json({
      success: true,
      data: { notifications, unreadCount },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id as string, userId: req.user!.userId },
      { isRead: true },
      { new: true },
    );
    if (!notification) throw ApiError.notFound('Notification not found');
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
}

export async function togglePin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notification = await Notification.findOne({ _id: req.params.id as string, userId: req.user!.userId });
    if (!notification) throw ApiError.notFound('Notification not found');

    notification.isPinned = !notification.isPinned;
    await notification.save();

    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
}

export async function deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await Notification.deleteOne({ _id: req.params.id as string, userId: req.user!.userId });
    if (result.deletedCount === 0) throw ApiError.notFound('Notification not found');
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await Notification.updateMany({ userId: req.user!.userId, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
}

export async function clearAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await Notification.deleteMany({ userId: req.user!.userId, isPinned: false });
    res.json({ success: true, message: 'Non-pinned notifications cleared' });
  } catch (error) {
    next(error);
  }
}
