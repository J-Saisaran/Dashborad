import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.js';
import { notificationQuerySchema } from '../validators/notification.validator.js';

const router = Router();

router.use(authenticate);

// Get user notifications (supports ?unreadOnly=true)
router.get(
  '/',
  validateRequest(notificationQuerySchema, 'query'),
  notificationController.getNotifications.bind(notificationController)
);

// Get live unread count
router.get(
  '/unread-count',
  notificationController.getUnreadCount.bind(notificationController)
);

// Mark all notifications as read
router.patch(
  '/read-all',
  notificationController.markAllAsRead.bind(notificationController)
);

// Mark individual notification as read
router.patch(
  '/:id/read',
  notificationController.markAsRead.bind(notificationController)
);

export default router;
