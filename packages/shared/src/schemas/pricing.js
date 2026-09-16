"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimatePricingSchema = exports.updatePricingRuleSchema = exports.createPricingRuleSchema = void 0;
const zod_1 = require("zod");
const enums_js_1 = require("../enums.js");
exports.createPricingRuleSchema = zod_1.z.object({
    serviceType: zod_1.z.nativeEnum(enums_js_1.ServiceType),
    originZone: zod_1.z.string().trim().min(1, 'Origin zone or city is required'),
    destinationZone: zod_1.z.string().trim().min(1, 'Destination zone or city is required'),
    baseFee: zod_1.z.number().int().nonnegative('Base fee must be non-negative'),
    perKgFee: zod_1.z.number().int().nonnegative('Per-kg fee must be non-negative').default(0),
    codFeeFlat: zod_1.z.number().int().nonnegative('Flat COD fee must be non-negative').default(0),
    codFeePercent: zod_1.z.number().min(0).max(1, 'COD fee percent must be between 0 and 1 (e.g. 0.02 for 2%)').default(0),
    isActive: zod_1.z.boolean().default(true),
    effectiveFrom: zod_1.z.string().or(zod_1.z.date()).optional(),
    effectiveTo: zod_1.z.string().or(zod_1.z.date()).optional().nullable(),
}).strict();
exports.updatePricingRuleSchema = exports.createPricingRuleSchema.partial().strict();
exports.estimatePricingSchema = zod_1.z.object({
    serviceType: zod_1.z.nativeEnum(enums_js_1.ServiceType).default(enums_js_1.ServiceType.STANDARD),
    originZone: zod_1.z.string().trim().min(2, 'Origin city is required'),
    destinationZone: zod_1.z.string().trim().min(2, 'Destination city is required'),
    weightKg: zod_1.z.number().positive('Weight must be greater than 0 kg'),
    paymentType: zod_1.z.nativeEnum(enums_js_1.PaymentType).default(enums_js_1.PaymentType.PREPAID),
    declaredOrCodAmount: zod_1.z.number().int().nonnegative().optional().default(0),
});
//# sourceMappingURL=pricing.js.map