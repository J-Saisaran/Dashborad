import { Router } from 'express';
import { taskController } from '../controllers/task.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireTaskAccess } from '../middlewares/resourceAuth.middleware.js';
import { requireAdmin } from '../middlewares/rbac.middleware.js';
import { validateRequest } from '../middlewares/validate.js';
import { taskFilterQuerySchema, updateTaskStatusSchema } from '../validators/task.validator.js';
import { scanAndMarkOverdueTasks } from '../jobs/overdueTask.job.js';

const router = Router();

router.use(authenticate);

// Developer dashboard endpoint: assigned tasks sorted by priority then due date
router.get(
  '/my-tasks',
  validateRequest(taskFilterQuerySchema, 'query'),
  taskController.getMyAssignedTasks.bind(taskController)
);

// Admin manual/testing trigger for background overdue job scan
router.post('/check-overdue', requireAdmin, async (_req, res, next) => {
  try {
    const result = await scanAndMarkOverdueTasks();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Individual task lookup
router.get(
  '/:id',
  requireTaskAccess('read', 'id'),
  taskController.getTaskById.bind(taskController)
);

// Status transition endpoint (validate input first to fail fast before DB access)
router.patch(
  '/:id/status',
  validateRequest(updateTaskStatusSchema),
  requireTaskAccess('update_status', 'id'),
  taskController.updateTaskStatus.bind(taskController)
);

export default router;
