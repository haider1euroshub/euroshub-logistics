import { z } from 'zod';
import { Role } from '../enums.js';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    fullName: z.ZodString;
    phone: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    fullName: string;
    phone: string;
}, {
    email: string;
    password: string;
    fullName: string;
    phone: string;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export declare const adminCreateUserSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    fullName: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    role: z.ZodEnum<[Role.ADMIN, Role.HUB_STAFF, Role.DRIVER]>;
    hubId: z.ZodOptional<z.ZodString>;
    homeHubId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    fullName: string;
    role: Role.ADMIN | Role.HUB_STAFF | Role.DRIVER;
    phone?: string | undefined;
    hubId?: string | undefined;
    homeHubId?: string | undefined;
}, {
    email: string;
    password: string;
    fullName: string;
    role: Role.ADMIN | Role.HUB_STAFF | Role.DRIVER;
    phone?: string | undefined;
    hubId?: string | undefined;
    homeHubId?: string | undefined;
}>, {
    email: string;
    password: string;
    fullName: string;
    role: Role.ADMIN | Role.HUB_STAFF | Role.DRIVER;
    phone?: string | undefined;
    hubId?: string | undefined;
    homeHubId?: string | undefined;
}, {
    email: string;
    password: string;
    fullName: string;
    role: Role.ADMIN | Role.HUB_STAFF | Role.DRIVER;
    phone?: string | undefined;
    hubId?: string | undefined;
    homeHubId?: string | undefined;
}>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
//# sourceMappingURL=auth.d.ts.map