import { z } from 'zod';
import { TaskPriority, TaskStatus } from '@prisma/client';

export const createTaskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters long').trim(),
  description: z.string().optional(),
  assignedToId: z.string().uuid('Invalid developer ID format').optional().nullable(),
  priority: z.nativeEnum(TaskPriority, {
    errorMap: () => ({ message: 'Priority must be LOW, MEDIUM, HIGH, or CRITICAL' }),
  }),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'dueDate must be a valid ISO date string',
  }),
});

export const updateTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus, {
    errorMap: () => ({ message: 'Status must be TO_DO, IN_PROGRESS, IN_REVIEW, or DONE' }),
  }),
});

export const taskFilterQuerySchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDateFrom: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'dueDateFrom must be a valid ISO date string',
    }),
  dueDateTo: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'dueDateTo must be a valid ISO date string',
    }),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type TaskFilterQuery = z.infer<typeof taskFilterQuerySchema>;
