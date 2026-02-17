import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { env } from '../config/env';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.signup(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function verifyOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, code } = req.body;
    const result = await authService.verifySignupOTP(
      userId,
      code,
      req.headers['user-agent'] || '',
      req.ip || '',
    );

    res.cookie('refreshToken', result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login({
      ...req.body,
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || '',
    });

    // User needs OTP verification first
    if ('requiresOTP' in result) {
      res.status(403).json({
        success: false,
        message: 'Email not verified. OTP sent to your email.',
        data: { requiresOTP: true, userId: result.userId },
      });
      return;
    }

    res.cookie('refreshToken', result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ success: false, message: 'Refresh token required' });
      return;
    }

    const tokens = await authService.refreshAccessToken(
      refreshToken,
      req.headers['user-agent'] || '',
      req.ip || '',
    );

    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      data: { accessToken: tokens.accessToken },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies?.refreshToken;
    await authService.logout(
      refreshToken,
      req.user!.userId,
      req.ip || '',
      req.headers['user-agent'] || '',
    );

    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.forgotPassword(req.body.email);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, code, newPassword } = req.body;
    await authService.resetPassword(userId, code, newPassword);
    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
}

export async function resendOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, purpose } = req.body;
    await authService.resendOTP(userId, purpose);
    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    next(error);
  }
}
