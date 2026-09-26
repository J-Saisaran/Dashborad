import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { env } from '../config/environment.js';
import { UnauthorizedError } from '../utils/errors.js';
import { AuthenticatedRequest } from '../types/auth.types.js';

const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: (env.COOKIE_SECURE ? 'none' : 'lax') as 'none' | 'lax',
  path: '/api/auth',
  maxAge: env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
});

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);

      // Store refresh token strictly in HttpOnly cookie
      res.cookie('refreshToken', result.rawRefreshToken, getRefreshTokenCookieOptions());

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);

      // Store refresh token strictly in HttpOnly cookie
      res.cookie('refreshToken', result.rawRefreshToken, getRefreshTokenCookieOptions());

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.refreshToken;
      if (!rawRefreshToken) {
        throw new UnauthorizedError('Refresh token is required in cookie', 'REFRESH_TOKEN_REQUIRED');
      }

      const result = await authService.refresh(rawRefreshToken);

      // Rotate cookie with new refresh token
      res.cookie('refreshToken', result.newRawRefreshToken, getRefreshTokenCookieOptions());

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.refreshToken;
      await authService.logout(rawRefreshToken);

      // Clear the refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: (env.COOKIE_SECURE ? 'none' : 'lax') as 'none' | 'lax',
        path: '/api/auth',
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getUserProfile(req.user!.id);
      res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
