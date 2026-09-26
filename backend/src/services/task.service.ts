import { Prisma, Role, TaskPriority, TaskStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AuthenticatedUser } from '../types/auth.types.js';
import { CreateTaskInput, TaskFilterQuery } from '../validators/task.validator.js';
import { NotFoundError } from '../utils/errors.js';
import { authorizationService } from './authorization.service.js';
import { buildActivitySummary } from '../utils/activityFormatter.js';
import { emitTaskStatusChanged } from '../websocket/event.emitter.js';
import { notificationService } from './notification.service.js';

// Priority sorting weight for dashboard sorting (CRITICAL -> HIGH -> MEDIUM -> LOW)
export const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export class TaskService {
  async createTask(user: AuthenticatedUser, projectId: string, input: CreateTaskInput) {
    // Ensure user has rights to add tasks to this project (Admin or PM owner)
    await authorizationService.validateProjectAccess(user, projectId, 'write');

    if (input.assignedToId) {
      const assignee = await prisma.user.findUnique({
        where: { id: input.assignedToId },
      });
      if (!assignee) {
        throw new NotFoundError('Assigned developer not found', 'USER_NOT_FOUND');
      }
    }

    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        assignedToId: input.assignedToId,
        priority: input.priority,
        dueDate: new Date(input.dueDate),
        projectId,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Assessment Requirement: "When a task is assigned to a Developer: create a DB notification"
    if (task.assignedToId) {
      await notificationService.createNotification({
        userId: task.assignedToId,
        taskId: task.id,
        title: 'Task Assigned',
        message: `You have been assigned to task "${task.title}" in project "${task.project.name}".`,
      });
    }

    return task;
  }

  async getProjectTasks(user: AuthenticatedUser, projectId: string, filters: TaskFilterQuery) {
    await authorizationService.validateProjectAccess(user, projectId, 'read');

    const where: Prisma.TaskWhereInput = {
      projectId,
    };

    // Developer isolation: Developer can only see their own assigned tasks
    if (user.role === Role.DEVELOPER) {
      where.assignedToId = user.id;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.dueDateFrom || filters.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) {
        where.dueDate.gte = new Date(filters.dueDateFrom);
      }
      if (filters.dueDateTo) {
        where.dueDate.lte = new Date(filters.dueDateTo);
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ dueDate: 'asc' }],
    });

    // Sort by priority descending (CRITICAL -> HIGH -> MEDIUM -> LOW), then by due date
    return tasks.sort((a, b) => {
      const weightDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
      if (weightDiff !== 0) return weightDiff;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }

  async getMyAssignedTasks(user: AuthenticatedUser, filters: TaskFilterQuery) {
    const where: Prisma.TaskWhereInput = {
      assignedToId: user.id,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.dueDateFrom || filters.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) {
        where.dueDate.gte = new Date(filters.dueDateFrom);
      }
      if (filters.dueDateTo) {
        where.dueDate.lte = new Date(filters.dueDateTo);
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }],
    });

    // Assessment requirement: "Developer dashboard: assigned tasks, sorted by priority then due date"
    return tasks.sort((a, b) => {
      const weightDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
      if (weightDiff !== 0) return weightDiff;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }

  async getTaskById(user: AuthenticatedUser, taskId: string) {
    return authorizationService.validateTaskAccess(user, taskId, 'read');
  }

  async updateTaskStatus(user: AuthenticatedUser, taskId: string, newStatus: TaskStatus) {
    const task = await authorizationService.validateTaskAccess(user, taskId, 'update_status');
    const previousStatus = task.status;

    if (previousStatus === newStatus) {
      return { task, previousStatus, newStatus, hasChanged: false };
    }

    // Atomic transaction: Task status update + Activity record creation
    const result = await prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: { status: newStatus },
        include: {
          project: { select: { id: true, name: true, ownerId: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });

      const actor = await tx.user.findUnique({
        where: { id: user.id },
        select: { name: true },
      });
      const userName = actor?.name || 'User';

      const summary = buildActivitySummary(userName, task.title, previousStatus, newStatus);

      const activity = await tx.activity.create({
        data: {
          taskId: task.id,
          projectId: task.projectId,
          userId: user.id,
          previousStatus,
          newStatus,
          summary,
        },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          task: { select: { id: true, title: true } },
        },
      });

      return {
        updatedTask,
        activity,
        summary,
      };
    });

    // Broadcast real-time event to project viewers & admins (Phase 7 Real-time Event Pipeline)
    emitTaskStatusChanged(task.projectId, {
      task: result.updatedTask,
      activity: {
        ...result.activity,
        relativeTime: 'just now',
        displayMessage: `${result.summary} · just now`,
      },
      previousStatus,
      newStatus,
    });

    // Assessment Requirement: "When a task owned by a PM moves to In Review: notify the PM"
    if (newStatus === TaskStatus.IN_REVIEW && result.updatedTask.project.ownerId !== user.id) {
      await notificationService.createNotification({
        userId: result.updatedTask.project.ownerId,
        taskId: result.updatedTask.id,
        title: 'Task In Review',
        message: `Task "${result.updatedTask.title}" was moved to In Review.`,
      });
    }

    return {
      task: result.updatedTask,
      activity: result.activity,
      previousStatus,
      newStatus,
      hasChanged: true,
    };
  }
}

export const taskService = new TaskService();
