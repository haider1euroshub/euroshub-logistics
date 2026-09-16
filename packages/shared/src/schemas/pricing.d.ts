import { z } from 'zod';
import { ServiceType, PaymentType } from '../enums.js';
export interface PricingRule {
    id: string;
    serviceType: ServiceType;
    originZone: string;
    destinationZone: string;
    baseFee: number;
    perKgFee: number;
    codFeeFlat: number;
    codFeePercent: number;
    isActive: boolean;
    effectiveFrom: string | Date;
    effectiveTo?: string | Date | null;
    createdAt?: string | Date;
}
export declare const createPricingRuleSchema: z.ZodObject<{
    serviceType: z.ZodNativeEnum<typeof ServiceType>;
    originZone: z.ZodString;
    destinationZone: z.ZodString;
    baseFee: z.ZodNumber;
    perKgFee: z.ZodDefault<z.ZodNumber>;
    codFeeFlat: z.ZodDefault<z.ZodNumber>;
    codFeePercent: z.ZodDefault<z.ZodNumber>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    effectiveFrom: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    effectiveTo: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
}, "strict", z.ZodTypeAny, {
    serviceType: ServiceType;
    isActive: boolean;
    originZone: string;
    destinationZone: string;
    baseFee: number;
    perKgFee: number;
    codFeeFlat: number;
    codFeePercent: number;
    effectiveFrom?: string | Date | undefined;
    effectiveTo?: string | Date | null | undefined;
}, {
    serviceType: ServiceType;
    originZone: string;
    destinationZone: string;
    baseFee: number;
    isActive?: boolean | undefined;
    perKgFee?: number | undefined;
    codFeeFlat?: number | undefined;
    codFeePercent?: number | undefined;
    effectiveFrom?: string | Date | undefined;
    effectiveTo?: string | Date | null | undefined;
}>;
export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;
export declare const updatePricingRuleSchema: z.ZodObject<{
    serviceType: z.ZodOptional<z.ZodNativeEnum<typeof ServiceType>>;
    originZone: z.ZodOptional<z.ZodString>;
    destinationZone: z.ZodOptional<z.ZodString>;
    baseFee: z.ZodOptional<z.ZodNumber>;
    perKgFee: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    codFeeFlat: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    codFeePercent: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    effectiveFrom: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    effectiveTo: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>>>;
}, "strict", z.ZodTypeAny, {
    serviceType?: ServiceType | undefined;
    isActive?: boolean | undefined;
    originZone?: string | undefined;
    destinationZone?: string | undefined;
    baseFee?: number | undefined;
    perKgFee?: number | undefined;
    codFeeFlat?: number | undefined;
    codFeePercent?: number | undefined;
    effectiveFrom?: string | Date | undefined;
    effectiveTo?: string | Date | null | undefined;
}, {
    serviceType?: ServiceType | undefined;
    isActive?: boolean | undefined;
    originZone?: string | undefined;
    destinationZone?: string | undefined;
    baseFee?: number | undefined;
    perKgFee?: number | undefined;
    codFeeFlat?: number | undefined;
    codFeePercent?: number | undefined;
    effectiveFrom?: string | Date | undefined;
    effectiveTo?: string | Date | null | undefined;
}>;
export type UpdatePricingRuleInput = z.infer<typeof updatePricingRuleSchema>;
export declare const estimatePricingSchema: z.ZodObject<{
    serviceType: z.ZodDefault<z.ZodNativeEnum<typeof ServiceType>>;
    originZone: z.ZodString;
    destinationZone: z.ZodString;
    weightKg: z.ZodNumber;
    paymentType: z.ZodDefault<z.ZodNativeEnum<typeof PaymentType>>;
    declaredOrCodAmount: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    serviceType: ServiceType;
    paymentType: PaymentType;
    weightKg: number;
    originZone: string;
    destinationZone: string;
    declaredOrCodAmount: number;
}, {
    weightKg: number;
    originZone: string;
    destinationZone: string;
    serviceType?: ServiceType | undefined;
    paymentType?: PaymentType | undefined;
    declaredOrCodAmount?: number | undefined;
}>;
export type EstimatePricingInput = z.infer<typeof estimatePricingSchema>;
//# sourceMappingURL=pricing.d.ts.map