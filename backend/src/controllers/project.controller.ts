import { Response, NextFunction } from 'express';
import { projectService } from '../services/project.service.js';
import { AuthenticatedRequest } from '../types/auth.types.js';

export class ProjectController {
  async createProject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.createProject(req.user!, req.body);
      res.status(201).json({
        success: true,
        data: { project },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjects(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projects = await projectService.getProjects(req.user!);
      res.status(200).json({
        success: true,
        data: { projects },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.getProjectById(req.user!, req.params.id);
      res.status(200).json({
        success: true,
        data: { project },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.updateProject(req.user!, req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: { project },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
