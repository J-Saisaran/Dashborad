import { Router } from 'express';
import { activityController } from '../controllers/activity.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/rbac.middleware.js';
import { validateRequest } from '../middlewares/validate.js';
import { activityQuerySchema } from '../validators/activity.validator.js';

const router = Router();

router.use(authenticate);

// Admin-only global activity feed
router.get(
  '/',
  requireAdmin,
  validateRequest(activityQuerySchema, 'query'),
  activityController.getAllActivities.bind(activityController)
);

export default router;
