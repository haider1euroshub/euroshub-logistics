"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryFailureSchema = exports.deliverShipmentSchema = exports.statusTransitionSchema = exports.updateShipmentSchema = exports.createShipmentSchema = void 0;
const zod_1 = require("zod");
const enums_js_1 = require("../enums.js");
exports.createShipmentSchema = zod_1.z.object({
    senderName: zod_1.z.string().trim().min(2, 'Sender name is required'),
    senderPhone: zod_1.z.string().trim().min(7, 'Valid sender phone is required'),
    senderAddress: zod_1.z.string().trim().min(5, 'Sender address is required'),
    senderCity: zod_1.z.string().trim().min(2, 'Sender city is required'),
    senderAddressExtra: zod_1.z.string().trim().optional(),
    receiverName: zod_1.z.string().trim().min(2, 'Receiver name is required'),
    receiverPhone: zod_1.z.string().trim().min(7, 'Valid receiver phone is required'),
    receiverAddress: zod_1.z.string().trim().min(5, 'Receiver address is required'),
    receiverCity: zod_1.z.string().trim().min(2, 'Receiver city is required'),
    receiverAddressExtra: zod_1.z.string().trim().optional(),
    originHubId: zod_1.z.string().optional(),
    destinationHubId: zod_1.z.string().optional(),
    serviceType: zod_1.z.nativeEnum(enums_js_1.ServiceType).default(enums_js_1.ServiceType.STANDARD),
    paymentType: zod_1.z.nativeEnum(enums_js_1.PaymentType),
    codAmount: zod_1.z.number().int().nonnegative().optional().nullable(),
    packageType: zod_1.z.string().trim().min(2, 'Package type is required (e.g. Document, Parcel, Box)'),
    weightKg: zod_1.z.number().positive('Weight must be greater than 0 kg'),
    lengthCm: zod_1.z.number().positive().optional().nullable(),
    widthCm: zod_1.z.number().positive().optional().nullable(),
    heightCm: zod_1.z.number().positive().optional().nullable(),
    description: zod_1.z.string().trim().optional().nullable(),
    declaredValue: zod_1.z.number().int().nonnegative().optional().nullable(),
    isFragile: zod_1.z.boolean().default(false),
}).superRefine((data, ctx) => {
    if (data.paymentType === enums_js_1.PaymentType.COD) {
        if (!data.codAmount || data.codAmount <= 0) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'COD amount must be greater than 0 for Cash on Delivery shipments',
                path: ['codAmount'],
            });
        }
    }
});
exports.updateShipmentSchema = zod_1.z.object({
    senderName: zod_1.z.string().trim().min(2).optional(),
    senderPhone: zod_1.z.string().trim().min(7).optional(),
    senderAddress: zod_1.z.string().trim().min(5).optional(),
    senderCity: zod_1.z.string().trim().min(2).optional(),
    senderAddressExtra: zod_1.z.string().trim().optional().nullable(),
    receiverName: zod_1.z.string().trim().min(2).optional(),
    receiverPhone: zod_1.z.string().trim().min(7).optional(),
    receiverAddress: zod_1.z.string().trim().min(5).optional(),
    receiverCity: zod_1.z.string().trim().min(2).optional(),
    receiverAddressExtra: zod_1.z.string().trim().optional().nullable(),
    packageType: zod_1.z.string().trim().min(2).optional(),
    weightKg: zod_1.z.number().positive().optional(),
    lengthCm: zod_1.z.number().positive().optional().nullable(),
    widthCm: zod_1.z.number().positive().optional().nullable(),
    heightCm: zod_1.z.number().positive().optional().nullable(),
    description: zod_1.z.string().trim().optional().nullable(),
    declaredValue: zod_1.z.number().int().nonnegative().optional().nullable(),
    isFragile: zod_1.z.boolean().optional(),
});
exports.statusTransitionSchema = zod_1.z.object({
    toStatus: zod_1.z.nativeEnum(enums_js_1.ShipmentStatus, {
        errorMap: () => ({ message: 'A valid target status is required' }),
    }),
    hubId: zod_1.z.string().optional(),
    note: zod_1.z.string().trim().optional(),
});
exports.deliverShipmentSchema = zod_1.z.object({
    recipientName: zod_1.z.string().trim().min(2, 'Recipient name is required').optional(),
    note: zod_1.z.string().trim().optional(),
    proofImageUrl: zod_1.z.string().url('Proof image must be a valid URL').optional().nullable(),
    amountCollected: zod_1.z.number().int().nonnegative('Amount collected cannot be negative').optional(),
    discrepancyNote: zod_1.z.string().trim().optional(),
});
exports.deliveryFailureSchema = zod_1.z.object({
    reason: zod_1.z.nativeEnum(enums_js_1.FailureReason, {
        errorMap: () => ({ message: 'A valid failure reason must be selected' }),
    }),
    note: zod_1.z.string().trim().optional(),
}).superRefine((data, ctx) => {
    if (data.reason === enums_js_1.FailureReason.OTHER && (!data.note || data.note.trim().length < 3)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'A descriptive note is required when failure reason is OTHER',
            path: ['note'],
        });
    }
});
//# sourceMappingURL=shipment.js.map