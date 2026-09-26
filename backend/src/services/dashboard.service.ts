import { Role, TaskStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AuthenticatedUser } from '../types/auth.types.js';
import { presenceManager } from '../websocket/presence.manager.js';
import { PRIORITY_WEIGHTS } from './task.service.js';

export class DashboardService {
  async getDashboardStats(user: AuthenticatedUser) {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (user.role === Role.ADMIN) {
      // 1. Total projects
      const totalProjects = await prisma.project.count();

      // 2. Total tasks by status
      const tasksByStatusRaw = await prisma.task.groupBy({
        by: ['status'],
        _count: { id: true },
      });

      const tasksByStatus: Record<string, number> = {
        TO_DO: 0,
        IN_PROGRESS: 0,
        IN_REVIEW: 0,
        DONE: 0,
        OVERDUE: 0,
      };
      tasksByStatusRaw.forEach((item) => {
        tasksByStatus[item.status] = item._count.id;
      });

      // 3. Overdue task count
      const overdueTaskCount = await prisma.task.count({
        where: {
          OR: [
            { status: TaskStatus.OVERDUE },
            {
              dueDate: { lt: now },
              status: { not: TaskStatus.DONE },
            },
          ],
        },
      });

      // 4. Active users online from presence manager
      const activeUsersOnline = presenceManager.getOnlineUserCount();

      return {
        role: Role.ADMIN,
        totalProjects,
        tasksByStatus,
        overdueTaskCount,
        activeUsersOnline,
      };
    }

    if (user.role === Role.PROJECT_MANAGER) {
      // PM can only view their own projects & team tasks
      const ownedProjects = await prisma.project.findMany({
        where: { ownerId: user.id },
        select: { id: true, name: true },
      });
      const projectIds = ownedProjects.map((p) => p.id);

      // Tasks by priority
      const tasksByPriorityRaw = await prisma.task.groupBy({
        where: { projectId: { in: projectIds } },
        by: ['priority'],
        _count: { id: true },
      });

      const tasksByPriority: Record<string, number> = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      };
      tasksByPriorityRaw.forEach((item) => {
        tasksByPriority[item.priority] = item._count.id;
      });

      // Upcoming due dates this week
      const upcomingDueDatesThisWeek = await prisma.task.findMany({
        where: {
          projectId: { in: projectIds },
          dueDate: { gte: now, lte: oneWeekFromNow },
          status: { not: TaskStatus.DONE },
        },
        orderBy: { dueDate: 'asc' },
        include: {
          project: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
        take: 10,
      });

      return {
        role: Role.PROJECT_MANAGER,
        projectSummary: {
          totalProjects: ownedProjects.length,
          projects: ownedProjects,
        },
        tasksByPriority,
        upcomingDueDatesThisWeek,
      };
    }

    if (user.role === Role.DEVELOPER) {
      // Developer dashboard: assigned tasks sorted by priority then due date
      const myTasks = await prisma.task.findMany({
        where: { assignedToId: user.id },
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: 'asc' }],
      });

      // Sort by priority descending then due date ascending
      const sortedTasks = [...myTasks].sort((a, b) => {
        const weightDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
        if (weightDiff !== 0) return weightDiff;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });

      const tasksByStatus: Record<string, number> = {
        TO_DO: 0,
        IN_PROGRESS: 0,
        IN_REVIEW: 0,
        DONE: 0,
        OVERDUE: 0,
      };
      myTasks.forEach((t) => {
        tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
      });

      return {
        role: Role.DEVELOPER,
        totalAssignedTasks: myTasks.length,
        tasksByStatus,
        assignedTasks: sortedTasks,
      };
    }

    return { role: user.role };
  }
}

export const dashboardService = new DashboardService();
