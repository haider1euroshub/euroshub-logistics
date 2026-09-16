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

export const createPricingRuleSchema = z.object({
  serviceType: z.nativeEnum(ServiceType),
  originZone: z.string().trim().min(1, 'Origin zone or city is required'),
  destinationZone: z.string().trim().min(1, 'Destination zone or city is required'),
  baseFee: z.number().int().nonnegative('Base fee must be non-negative'),
  perKgFee: z.number().int().nonnegative('Per-kg fee must be non-negative').default(0),
  codFeeFlat: z.number().int().nonnegative('Flat COD fee must be non-negative').default(0),
  codFeePercent: z.number().min(0).max(1, 'COD fee percent must be between 0 and 1 (e.g. 0.02 for 2%)').default(0),
  isActive: z.boolean().default(true),
  effectiveFrom: z.string().or(z.date()).optional(),
  effectiveTo: z.string().or(z.date()).optional().nullable(),
}).strict();

export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;

export const updatePricingRuleSchema = createPricingRuleSchema.partial().strict();
export type UpdatePricingRuleInput = z.infer<typeof updatePricingRuleSchema>;

export const estimatePricingSchema = z.object({
  serviceType: z.nativeEnum(ServiceType).default(ServiceType.STANDARD),
  originZone: z.string().trim().min(2, 'Origin city is required'),
  destinationZone: z.string().trim().min(2, 'Destination city is required'),
  weightKg: z.number().positive('Weight must be greater than 0 kg'),
  paymentType: z.nativeEnum(PaymentType).default(PaymentType.PREPAID),
  declaredOrCodAmount: z.number().int().nonnegative().optional().default(0),
});

export type EstimatePricingInput = z.infer<typeof estimatePricingSchema>;
