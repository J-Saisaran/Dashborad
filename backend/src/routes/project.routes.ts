import { Router } from 'express';
import { projectController } from '../controllers/project.controller.js';
import { taskController } from '../controllers/task.controller.js';
import { activityController } from '../controllers/activity.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireManagerOrAdmin } from '../middlewares/rbac.middleware.js';
import { requireProjectAccess } from '../middlewares/resourceAuth.middleware.js';
import { validateRequest } from '../middlewares/validate.js';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator.js';
import { createTaskSchema, taskFilterQuerySchema } from '../validators/task.validator.js';
import { activityQuerySchema, missedActivitiesQuerySchema } from '../validators/activity.validator.js';

const router = Router();

router.use(authenticate);

// Project Endpoints
router.post(
  '/',
  requireManagerOrAdmin,
  validateRequest(createProjectSchema),
  projectController.createProject.bind(projectController)
);

router.get('/', projectController.getProjects.bind(projectController));

router.get(
  '/:id',
  requireProjectAccess('read', 'id'),
  projectController.getProjectById.bind(projectController)
);

router.put(
  '/:id',
  requireManagerOrAdmin,
  validateRequest(updateProjectSchema),
  requireProjectAccess('write', 'id'),
  projectController.updateProject.bind(projectController)
);

// Nested Project Tasks Endpoints
router.get(
  '/:projectId/tasks',
  validateRequest(taskFilterQuerySchema, 'query'),
  taskController.getProjectTasks.bind(taskController)
);

router.post(
  '/:projectId/tasks',
  requireManagerOrAdmin,
  validateRequest(createTaskSchema),
  taskController.createTask.bind(taskController)
);

// Nested Project Activities Feed (Admin, PM owner, Developer assigned)
router.get(
  '/:projectId/activities',
  validateRequest(activityQuerySchema, 'query'),
  activityController.getProjectActivities.bind(activityController)
);

// Missed-Events Recovery Endpoint (retrieves last 20 missed events directly from PostgreSQL)
router.get(
  '/:projectId/activities/missed',
  validateRequest(missedActivitiesQuerySchema, 'query'),
  activityController.getMissedActivities.bind(activityController)
);

export default router;
