import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Prediction } from '../models/Prediction';
import { RefreshToken } from '../models/RefreshToken';
import { AuditLog } from '../models/AuditLog';
import { hashPassword, comparePassword } from '../utils/hash';
import { ApiError } from '../utils/apiError';

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) throw ApiError.notFound('User not found');

    // Compute stats
    const predictions = await Prediction.find({ userId: user._id });
    const scored = predictions.filter((p) => p.accuracy?.mae !== null);
    const totalPredictions = predictions.length;
    const avgAccuracy =
      scored.length > 0
        ? scored.reduce((sum, p) => sum + Math.max(0, (20 - (p.accuracy.mae || 20)) / 20) * 100, 0) / scored.length
        : null;

    res.json({
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        favoriteDriver: user.favoriteDriver,
        favoriteTeam: user.favoriteTeam,
        preferences: user.preferences,
        stats: {
          totalPredictions,
          avgAccuracy,
          memberSince: user.createdAt,
          lastLogin: user.lastLogin,
          loginCount: user.loginCount,
        },
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const allowedFields = ['name', 'avatar', 'favoriteDriver', 'favoriteTeam'];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(req.user!.userId, updates, { new: true });
    if (!user) throw ApiError.notFound('User not found');

    res.json({
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        favoriteDriver: user.favoriteDriver,
        favoriteTeam: user.favoriteTeam,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const prefUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(req.body)) {
      prefUpdates[`preferences.${key}`] = value;
    }

    const user = await User.findByIdAndUpdate(req.user!.userId, { $set: prefUpdates }, { new: true });
    if (!user) throw ApiError.notFound('User not found');

    res.json({
      success: true,
      data: { preferences: user.preferences },
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user!.userId).select('+password');
    if (!user) throw ApiError.notFound('User not found');

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    // Revoke all refresh tokens except current session
    await RefreshToken.deleteMany({ userId: user._id });

    await AuditLog.create({
      userId: user._id,
      action: 'password-change',
      resource: 'user',
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({ success: true, message: 'Password changed successfully. Please log in again on other devices.' });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) throw ApiError.notFound('User not found');

    // Soft delete
    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    // Revoke all sessions
    await RefreshToken.deleteMany({ userId: user._id });

    await AuditLog.create({
      userId: user._id,
      action: 'account-deleted',
      resource: 'user',
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
}
