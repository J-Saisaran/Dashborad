import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

/**
 * Middleware factory ensuring the authenticated user possesses one of the allowed roles.
 * Must be preceded by the `authenticate` middleware.
 */
export const requireRoles = (...allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication is required', 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Role '${req.user.role}' is not authorized for this resource.`,
          'FORBIDDEN_ROLE'
        )
      );
    }

    next();
  };
};

/**
 * Convenience role guard: Admin only
 */
export const requireAdmin = requireRoles(Role.ADMIN);

/**
 * Convenience role guard: Project Manager or Admin
 */
export const requireManagerOrAdmin = requireRoles(Role.ADMIN, Role.PROJECT_MANAGER);
