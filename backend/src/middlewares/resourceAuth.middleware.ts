import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { authorizationService } from '../services/authorization.service.js';
import { UnauthorizedError, BadRequestError } from '../utils/errors.js';

export interface ResourceAuthRequest extends AuthenticatedRequest {
  authorizedProject?: any;
  authorizedTask?: any;
}

/**
 * Middleware that validates project access based on route param (default 'id' or 'projectId').
 */
export const requireProjectAccess = (
  action: 'read' | 'write' | 'delete' = 'read',
  paramName = 'id'
) => {
  return async (req: ResourceAuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required', 'UNAUTHORIZED'));
      }

      const projectId = req.params[paramName];
      if (!projectId) {
        return next(new BadRequestError(`Missing required parameter: ${paramName}`));
      }

      const project = await authorizationService.validateProjectAccess(req.user, projectId, action);
      req.authorizedProject = project;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware that validates task access based on route param (default 'id' or 'taskId').
 */
export const requireTaskAccess = (
  action: 'read' | 'update_status' | 'manage' = 'read',
  paramName = 'id'
) => {
  return async (req: ResourceAuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required', 'UNAUTHORIZED'));
      }

      const taskId = req.params[paramName];
      if (!taskId) {
        return next(new BadRequestError(`Missing required parameter: ${paramName}`));
      }

      const task = await authorizationService.validateTaskAccess(req.user, taskId, action);
      req.authorizedTask = task;
      next();
    } catch (error) {
      next(error);
    }
  };
};
