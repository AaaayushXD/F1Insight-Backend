import { Request, Response, NextFunction } from 'express';
import { Role } from '../types';
import { ApiError } from '../utils/apiError';

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRole = req.user?.role as Role | undefined;

    if (!userRole || !allowedRoles.includes(userRole)) {
      next(ApiError.forbidden('Insufficient permissions'));
      return;
    }

    next();
  };
}

export const adminOnly = requireRole('admin');
export const moderatorUp = requireRole('moderator', 'admin');
