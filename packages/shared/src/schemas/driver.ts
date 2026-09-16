import { z } from 'zod';

export const assignDriverSchema = z.object({
  driverId: z.string().min(1, 'Driver ID is required'),
});

export type AssignDriverInput = z.infer<typeof assignDriverSchema>;
