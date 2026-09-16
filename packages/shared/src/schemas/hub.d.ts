import { z } from 'zod';
export declare const createHubSchema: z.ZodObject<{
    name: z.ZodString;
    code: z.ZodString;
    address: z.ZodString;
    city: z.ZodString;
    phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    latitude: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    longitude: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    code: string;
    name: string;
    address: string;
    city: string;
    isActive: boolean;
    phone?: string | null | undefined;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
}, {
    code: string;
    name: string;
    address: string;
    city: string;
    phone?: string | null | undefined;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
    isActive?: boolean | undefined;
}>;
export type CreateHubInput = z.infer<typeof createHubSchema>;
export declare const updateHubSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    latitude: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    longitude: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    phone?: string | null | undefined;
    code?: string | undefined;
    name?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
    isActive?: boolean | undefined;
}, {
    phone?: string | null | undefined;
    code?: string | undefined;
    name?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
    isActive?: boolean | undefined;
}>;
export type UpdateHubInput = z.infer<typeof updateHubSchema>;
//# sourceMappingURL=hub.d.ts.map