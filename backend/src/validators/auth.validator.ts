import { z } from 'zod';
import { Role } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long').trim(),
  role: z.nativeEnum(Role, {
    errorMap: () => ({ message: 'Role must be ADMIN, PROJECT_MANAGER, or DEVELOPER' }),
  }),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.nativeEnum(Role, {
    errorMap: () => ({ message: 'Role must be ADMIN, PROJECT_MANAGER, or DEVELOPER' }),
  }).optional().default(Role.DEVELOPER),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
