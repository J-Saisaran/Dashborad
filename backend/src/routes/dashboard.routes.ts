import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Role-tailored dashboard metrics
router.get('/stats', dashboardController.getStats.bind(dashboardController));

export default router;
