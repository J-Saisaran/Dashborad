import { z } from 'zod';

export const activityQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => val > 0 && val <= 100, {
      message: 'limit must be between 1 and 100',
    }),
  before: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'before must be a valid ISO date string',
    }),
});

export type ActivityQuery = z.infer<typeof activityQuerySchema>;

export const missedActivitiesQuerySchema = z.object({
  since: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'since must be a valid ISO date string',
    }),
});

export type MissedActivitiesQuery = z.infer<typeof missedActivitiesQuerySchema>;
