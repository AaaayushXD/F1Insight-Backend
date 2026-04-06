import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Prediction } from '../models/Prediction';
import { AuditLog } from '../models/AuditLog';
import { Notification } from '../models/Notification';
import * as mlService from '../services/ml.service';
import { getCacheStats, flushCache } from '../services/cache.service';
import { ApiError } from '../utils/apiError';

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const role = req.query.role as string | undefined;

    const query: Record<string, any> = {};
    if (role) query.role = role;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      data: { users },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.params.id as string).select('-password');
    if (!user) throw ApiError.notFound('User not found');

    const predictionCount = await Prediction.countDocuments({ userId: user._id });

    res.json({
      success: true,
      data: { ...user.toObject(), predictionCount },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role } = req.body;
    if (!['user', 'moderator', 'admin'].includes(role)) {
      throw ApiError.badRequest('Invalid role');
    }

    const user = await User.findById(req.params.id as string);
    if (!user) throw ApiError.notFound('User not found');

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'role-change',
      resource: 'user',
      details: { targetUserId: user._id, previousRole, newRole: role },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({ success: true, data: { id: user._id, role: user.role, previousRole } });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.params.id as string);
    if (!user) throw ApiError.notFound('User not found');

    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'user-deleted',
      resource: 'user',
      details: { deletedUserId: user._id, email: user.email },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({ success: true, message: 'User soft-deleted' });
  } catch (error) {
    next(error);
  }
}

export async function getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const action = req.query.action as string | undefined;

    const query: Record<string, any> = {};
    if (action) query.action = action;

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email');

    res.json({
      success: true,
      data: { logs },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

export async function getSystemStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [totalUsers, verifiedUsers, totalPredictions, cacheStats] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      Prediction.countDocuments(),
      getCacheStats(),
    ]);

    let mlStatus = 'unavailable';
    try {
      await mlService.checkHealth();
      mlStatus = 'healthy';
    } catch {
      // ML service is down
    }

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, verified: verifiedUsers },
        predictions: { total: totalPredictions },
        mlService: { status: mlStatus },
        cache: cacheStats,
        uptime: process.uptime(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function broadcastNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, message, type } = req.body;

    const users = await User.find({ isVerified: true }).select('_id');
    const notifications = users.map((u) => ({
      userId: u._id,
      type: type || 'system',
      title,
      message,
    }));

    await Notification.insertMany(notifications);

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'broadcast-notification',
      resource: 'notification',
      details: { title, type: type || 'system', userCount: users.length },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({ success: true, message: `Notification sent to ${users.length} users` });
  } catch (error) {
    next(error);
  }
}

export async function triggerMLCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startYear, endYear } = req.body;
    const result = await mlService.triggerDataCollection(startYear || 2014, endYear || new Date().getFullYear());

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'ml-data-collection',
      resource: 'ml-service',
      details: { startYear, endYear },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function flushCacheEndpoint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await flushCache();

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'cache-flush',
      resource: 'cache',
      details: {},
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({ success: true, message: 'Cache flushed' });
  } catch (error) {
    next(error);
  }
}
