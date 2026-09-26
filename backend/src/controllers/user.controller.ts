import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../types/auth.types.js';

export class UserController {
  async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleQuery = req.query.role as Role | undefined;
      // Scoping: Project Managers can ONLY view DEVELOPERs for task assignment; never Admin or other PMs
      const effectiveRole = req.user?.role === Role.PROJECT_MANAGER ? Role.DEVELOPER : roleQuery;
      const users = await userService.getUsers(effectiveRole);
      res.status(200).json({
        success: true,
        data: { users },
      });
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
