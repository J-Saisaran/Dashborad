import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireAdmin, requireManagerOrAdmin } from '../middlewares/rbac.middleware.js';
import { validateRequest } from '../middlewares/validate.js';
import { createUserSchema } from '../validators/auth.validator.js';

const router = Router();

router.use(authenticate);

// List users (e.g. developers for task assignment dropdowns)
router.get('/', requireManagerOrAdmin, userController.getUsers.bind(userController));

// Create users (Admin only)
router.post('/', requireAdmin, validateRequest(createUserSchema), userController.createUser.bind(userController));

export default router;
