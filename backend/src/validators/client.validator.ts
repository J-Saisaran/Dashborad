import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(2, 'Client name must be at least 2 characters long').trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  company: z.string().min(2, 'Company name must be at least 2 characters long').trim(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
