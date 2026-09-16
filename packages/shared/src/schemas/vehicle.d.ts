import { z } from 'zod';
import { VehicleStatus } from '../enums.js';
export declare const createVehicleSchema: z.ZodObject<{
    registrationNo: z.ZodString;
    type: z.ZodString;
    makeModel: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodNativeEnum<typeof VehicleStatus>>;
    currentMileage: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    driverId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    hubId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: string;
    status: VehicleStatus;
    registrationNo: string;
    hubId?: string | null | undefined;
    driverId?: string | null | undefined;
    makeModel?: string | null | undefined;
    currentMileage?: number | null | undefined;
    notes?: string | null | undefined;
}, {
    type: string;
    registrationNo: string;
    status?: VehicleStatus | undefined;
    hubId?: string | null | undefined;
    driverId?: string | null | undefined;
    makeModel?: string | null | undefined;
    currentMileage?: number | null | undefined;
    notes?: string | null | undefined;
}>;
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export declare const updateVehicleSchema: z.ZodObject<{
    registrationNo: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    makeModel: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodNativeEnum<typeof VehicleStatus>>>;
    currentMileage: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    driverId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    hubId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    type?: string | undefined;
    status?: VehicleStatus | undefined;
    hubId?: string | null | undefined;
    driverId?: string | null | undefined;
    registrationNo?: string | undefined;
    makeModel?: string | null | undefined;
    currentMileage?: number | null | undefined;
    notes?: string | null | undefined;
}, {
    type?: string | undefined;
    status?: VehicleStatus | undefined;
    hubId?: string | null | undefined;
    driverId?: string | null | undefined;
    registrationNo?: string | undefined;
    makeModel?: string | null | undefined;
    currentMileage?: number | null | undefined;
    notes?: string | null | undefined;
}>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
//# sourceMappingURL=vehicle.d.ts.map