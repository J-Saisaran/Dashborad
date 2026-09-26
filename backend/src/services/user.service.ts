import { Role } from '@prisma/client';
import { prisma } from '../config/database.js';
import { CreateUserInput } from '../validators/auth.validator.js';
import { hashPassword } from '../utils/crypto.js';
import { ConflictError } from '../utils/errors.js';

export class UserService {
  async getUsers(role?: Role) {
    return prisma.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createUser(input: CreateUserInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictError('A user with this email already exists', 'USER_ALREADY_EXISTS');
    }

    const passwordHash = await hashPassword(input.password);
    return prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }
}

export const userService = new UserService();
