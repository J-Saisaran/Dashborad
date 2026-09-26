import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { Role } from '@prisma/client';

export class UserController {
  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleQuery = req.query.role as Role | undefined;
      const users = await userService.getUsers(roleQuery);
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
