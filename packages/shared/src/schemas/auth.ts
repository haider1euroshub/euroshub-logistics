import { z } from 'zod';
import { Role } from '../enums.js';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().trim().min(10, 'Valid phone number is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const adminCreateUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().trim().optional(),
  role: z.enum([Role.ADMIN, Role.HUB_STAFF, Role.DRIVER], {
    errorMap: () => ({ message: 'Staff role must be ADMIN, HUB_STAFF, or DRIVER' }),
  }),
  hubId: z.string().optional(), // For HUB_STAFF
  homeHubId: z.string().optional(), // For DRIVER
}).superRefine((data, ctx) => {
  if (data.role === Role.HUB_STAFF && !data.hubId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'hubId is required for HUB_STAFF role',
      path: ['hubId'],
    });
  }
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
