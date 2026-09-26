import { Role } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AuthenticatedUser } from '../types/auth.types.js';
import { CreateProjectInput, UpdateProjectInput } from '../validators/project.validator.js';
import { NotFoundError } from '../utils/errors.js';
import { authorizationService } from './authorization.service.js';

export class ProjectService {
  async createProject(user: AuthenticatedUser, input: CreateProjectInput) {
    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: input.clientId },
    });
    if (!client) {
      throw new NotFoundError('Client not found', 'CLIENT_NOT_FOUND');
    }

    // Determine owner: PM is always owner of projects they create; Admin can assign or default to self
    const ownerId = user.role === Role.ADMIN && input.ownerId ? input.ownerId : user.id;

    // Verify owner exists and is at least PM or Admin
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
    });
    if (!owner) {
      throw new NotFoundError('Owner user not found', 'USER_NOT_FOUND');
    }

    return prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        clientId: input.clientId,
        ownerId,
      },
      include: {
        client: { select: { id: true, name: true, company: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async getProjects(user: AuthenticatedUser) {
    if (user.role === Role.ADMIN) {
      return prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, company: true } },
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { tasks: true } },
        },
      });
    }

    if (user.role === Role.PROJECT_MANAGER) {
      return prisma.project.findMany({
        where: { ownerId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, company: true } },
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { tasks: true } },
        },
      });
    }

    // Developer: view projects containing tasks assigned to them
    return prisma.project.findMany({
      where: {
        tasks: {
          some: { assignedToId: user.id },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, company: true } },
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true } },
      },
    });
  }

  async getProjectById(user: AuthenticatedUser, projectId: string) {
    await authorizationService.validateProjectAccess(user, projectId, 'read');

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        owner: { select: { id: true, name: true, email: true } },
        tasks: {
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
          },
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
    }

    return project;
  }

  async updateProject(user: AuthenticatedUser, projectId: string, input: UpdateProjectInput) {
    await authorizationService.validateProjectAccess(user, projectId, 'write');

    return prisma.project.update({
      where: { id: projectId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
      include: {
        client: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  }
}

export const projectService = new ProjectService();
