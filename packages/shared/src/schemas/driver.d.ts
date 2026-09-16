import { z } from 'zod';
export declare const assignDriverSchema: z.ZodObject<{
    driverId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    driverId: string;
}, {
    driverId: string;
}>;
export type AssignDriverInput = z.infer<typeof assignDriverSchema>;
//# sourceMappingURL=driver.d.ts.map