import { z } from 'zod';

export const createHubSchema = z.object({
  name: z.string().trim().min(2, 'Hub name is required'),
  code: z.string().trim().min(2, 'Hub code is required (e.g. KHI-01)').toUpperCase(),
  address: z.string().trim().min(5, 'Hub address is required'),
  city: z.string().trim().min(2, 'City is required'),
  phone: z.string().trim().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CreateHubInput = z.infer<typeof createHubSchema>;

export const updateHubSchema = createHubSchema.partial();
export type UpdateHubInput = z.infer<typeof updateHubSchema>;
