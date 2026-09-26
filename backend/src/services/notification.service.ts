import { prisma } from '../config/database.js';
import { emitNotification, emitUnreadCount } from '../websocket/event.emitter.js';
import { NotFoundError } from '../utils/errors.js';
import { NotificationQuery } from '../validators/notification.validator.js';

export interface CreateNotificationParams {
  userId: string;
  taskId?: string;
  title: string;
  message: string;
}

export class NotificationService {
  /**
   * Creates a persistent database notification and pushes it via WebSocket to the recipient.
   */
  async createNotification(params: CreateNotificationParams) {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        taskId: params.taskId,
        title: params.title,
        message: params.message,
      },
    });

    // Real-time unread count recalculation
    const unreadCount = await prisma.notification.count({
      where: { userId: params.userId, isRead: false },
    });

    // Push live event to user's private room
    emitNotification(params.userId, notification);
    emitUnreadCount(params.userId, unreadCount);

    return notification;
  }

  /**
   * Retrieves notifications for the authenticated user with optional unread filter.
   */
  async getUserNotifications(userId: string, query: NotificationQuery) {
    const where: any = { userId };
    if (query.unreadOnly) {
      where.isRead = false;
    }

    return prisma.notification.findMany({
      where,
      take: query.limit || 50,
      orderBy: { createdAt: 'desc' },
      include: {
        task: { select: { id: true, title: true, priority: true } },
      },
    });
  }

  /**
   * Retrieves current unread notification count.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark individual notification as read with ownership enforcement.
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundError('Notification not found', 'NOTIFICATION_NOT_FOUND');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    const unreadCount = await this.getUnreadCount(userId);
    emitUnreadCount(userId, unreadCount);

    return updated;
  }

  /**
   * Mark all unread notifications as read for current user.
   */
  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    emitUnreadCount(userId, 0);

    return { updatedCount: result.count };
  }
}

export const notificationService = new NotificationService();
