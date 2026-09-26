import { z } from 'zod';

export const notificationQuerySchema = z.object({
  unreadOnly: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .refine((val) => val > 0 && val <= 100, {
      message: 'limit must be between 1 and 100',
    }),
});

export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
