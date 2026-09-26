import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AuthenticatedUser } from '../types/auth.types.js';
import { ActivityQuery } from '../validators/activity.validator.js';
import { formatRelativeTime } from '../utils/activityFormatter.js';
import { authorizationService } from './authorization.service.js';

export class ActivityService {
  /**
   * Fetch project activities scoped by user role:
   * - Admin: all activities in project
   * - Project Manager: all activities in their project
   * - Developer: activities strictly for tasks assigned to them
   */
  async getProjectActivities(user: AuthenticatedUser, projectId: string, query: ActivityQuery) {
    await authorizationService.validateProjectAccess(user, projectId, 'read');

    const limit = query.limit || 20;

    const where: Prisma.ActivityWhereInput = {
      projectId,
    };

    // Developer visibility restriction: only tasks assigned to this developer
    if (user.role === Role.DEVELOPER) {
      where.task = {
        assignedToId: user.id,
      };
    }

    if (query.before) {
      where.createdAt = {
        lt: new Date(query.before),
      };
    }

    const activities = await prisma.activity.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        task: { select: { id: true, title: true, priority: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return activities.map((activity) => ({
      ...activity,
      relativeTime: formatRelativeTime(activity.createdAt),
      displayMessage: `${activity.summary} · ${formatRelativeTime(activity.createdAt)}`,
    }));
  }

  /**
   * Admin-only: View activity across all projects in the entire organization.
   */
  async getAllActivities(query: ActivityQuery) {
    const limit = query.limit || 20;

    const where: Prisma.ActivityWhereInput = {};
    if (query.before) {
      where.createdAt = {
        lt: new Date(query.before),
      };
    }

    const activities = await prisma.activity.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        task: { select: { id: true, title: true, priority: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return activities.map((activity) => ({
      ...activity,
      relativeTime: formatRelativeTime(activity.createdAt),
      displayMessage: `${activity.summary} · ${formatRelativeTime(activity.createdAt)}`,
    }));
  }

  /**
   * Missed-Event Recovery (PDF Requirement):
   * "If a user goes offline and reconnects:
   *  - retrieve the last 20 missed activity events from PostgreSQL
   *  - do not rely on in-memory cache"
   */
  async getMissedActivities(user: AuthenticatedUser, projectId: string, since?: string) {
    await authorizationService.validateProjectAccess(user, projectId, 'read');

    const where: Prisma.ActivityWhereInput = {
      projectId,
    };

    // Strict role isolation: Developer only retrieves missed events for assigned tasks
    if (user.role === Role.DEVELOPER) {
      where.task = {
        assignedToId: user.id,
      };
    }

    if (since) {
      where.createdAt = {
        gt: new Date(since),
      };
    }

    // Direct PostgreSQL query taking the last 20 missed events (backed by index idx_activities_project_recent)
    const activities = await prisma.activity.findMany({
      where,
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        task: { select: { id: true, title: true, priority: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return activities.map((activity) => ({
      ...activity,
      relativeTime: formatRelativeTime(activity.createdAt),
      displayMessage: `${activity.summary} · ${formatRelativeTime(activity.createdAt)}`,
    }));
  }
}

export const activityService = new ActivityService();
