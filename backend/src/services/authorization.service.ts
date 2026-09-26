import { Role } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AuthenticatedUser } from '../types/auth.types.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';

export class AuthorizationService {
  /**
   * Validates whether the user is permitted to perform the specified action on a project.
   * - ADMIN: unrestricted access
   * - PROJECT_MANAGER: access restricted strictly to projects they created (ownerId === user.id)
   * - DEVELOPER: read-only access restricted strictly to projects where they have assigned tasks
   */
  async validateProjectAccess(
    user: AuthenticatedUser,
    projectId: string,
    action: 'read' | 'write' | 'delete' = 'read'
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
    }

    if (user.role === Role.ADMIN) {
      return project;
    }

    if (user.role === Role.PROJECT_MANAGER) {
      if (project.ownerId !== user.id) {
        throw new ForbiddenError(
          'Access denied. A Project Manager can only access and manage projects they created.',
          'FORBIDDEN_PROJECT_ACCESS'
        );
      }
      return project;
    }

    if (user.role === Role.DEVELOPER) {
      if (action !== 'read') {
        throw new ForbiddenError(
          'Developers are not permitted to modify or delete projects.',
          'FORBIDDEN_ACTION'
        );
      }

      // Check if developer has at least one assigned task in this project
      const assignedCount = await prisma.task.count({
        where: {
          projectId,
          assignedToId: user.id,
        },
      });

      if (assignedCount === 0) {
        throw new ForbiddenError(
          'Access denied. You are not assigned to any tasks within this project.',
          'FORBIDDEN_PROJECT_ACCESS'
        );
      }

      return project;
    }

    throw new ForbiddenError('Access denied.', 'FORBIDDEN_RESOURCE');
  }

  /**
   * Validates whether the user is permitted to perform the specified action on a task.
   * - ADMIN: unrestricted access
   * - PROJECT_MANAGER: access restricted strictly to tasks belonging to projects they own
   * - DEVELOPER: can only view and update status of tasks assigned directly to them
   */
  async validateTaskAccess(
    user: AuthenticatedUser,
    taskId: string,
    action: 'read' | 'update_status' | 'manage' = 'read'
  ) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
    }

    if (user.role === Role.ADMIN) {
      return task;
    }

    if (user.role === Role.PROJECT_MANAGER) {
      if (task.project.ownerId !== user.id) {
        throw new ForbiddenError(
          'Access denied. You cannot view or modify tasks belonging to another Project Manager’s project.',
          'FORBIDDEN_TASK_ACCESS'
        );
      }
      return task;
    }

    if (user.role === Role.DEVELOPER) {
      if (action === 'manage') {
        throw new ForbiddenError(
          'Developers cannot reassign, reschedule, or modify task metadata.',
          'FORBIDDEN_ACTION'
        );
      }

      if (task.assignedToId !== user.id) {
        throw new ForbiddenError(
          'Access denied. Developers can only access tasks assigned to them.',
          'FORBIDDEN_TASK_ACCESS'
        );
      }

      return task;
    }

    throw new ForbiddenError('Access denied.', 'FORBIDDEN_RESOURCE');
  }
}

export const authorizationService = new AuthorizationService();
