import { Response, NextFunction } from 'express';
import { activityService } from '../services/activity.service.js';
import { AuthenticatedRequest } from '../types/auth.types.js';

export class ActivityController {
  async getProjectActivities(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const activities = await activityService.getProjectActivities(
        req.user!,
        req.params.projectId,
        req.query as any
      );
      res.status(200).json({
        success: true,
        data: { activities },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllActivities(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const activities = await activityService.getAllActivities(req.query as any);
      res.status(200).json({
        success: true,
        data: { activities },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMissedActivities(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const since = req.query.since as string | undefined;
      const activities = await activityService.getMissedActivities(
        req.user!,
        req.params.projectId,
        since
      );
      res.status(200).json({
        success: true,
        data: { activities },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const activityController = new ActivityController();
