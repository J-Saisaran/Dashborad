import { Response, NextFunction } from 'express';
import { taskService } from '../services/task.service.js';
import { AuthenticatedRequest } from '../types/auth.types.js';

export class TaskController {
  async createTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.createTask(req.user!, req.params.projectId, req.body);
      res.status(201).json({
        success: true,
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectTasks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tasks = await taskService.getProjectTasks(req.user!, req.params.projectId, req.query as any);
      res.status(200).json({
        success: true,
        data: { tasks },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyAssignedTasks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tasks = await taskService.getMyAssignedTasks(req.user!, req.query as any);
      res.status(200).json({
        success: true,
        data: { tasks },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTaskById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.getTaskById(req.user!, req.params.id);
      res.status(200).json({
        success: true,
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTaskStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await taskService.updateTaskStatus(req.user!, req.params.id, req.body.status);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const taskController = new TaskController();
