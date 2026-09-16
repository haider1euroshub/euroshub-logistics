import { z } from 'zod';
import { ServiceType, PaymentType, ShipmentStatus, FailureReason } from '../enums.js';

export const createShipmentSchema = z.object({
  senderName: z.string().trim().min(2, 'Sender name is required'),
  senderPhone: z.string().trim().min(7, 'Valid sender phone is required'),
  senderAddress: z.string().trim().min(5, 'Sender address is required'),
  senderCity: z.string().trim().min(2, 'Sender city is required'),
  senderAddressExtra: z.string().trim().optional(),

  receiverName: z.string().trim().min(2, 'Receiver name is required'),
  receiverPhone: z.string().trim().min(7, 'Valid receiver phone is required'),
  receiverAddress: z.string().trim().min(5, 'Receiver address is required'),
  receiverCity: z.string().trim().min(2, 'Receiver city is required'),
  receiverAddressExtra: z.string().trim().optional(),

  originHubId: z.string().optional(),
  destinationHubId: z.string().optional(),

  serviceType: z.nativeEnum(ServiceType).default(ServiceType.STANDARD),
  paymentType: z.nativeEnum(PaymentType),
  codAmount: z.number().int().nonnegative().optional().nullable(),

  packageType: z.string().trim().min(2, 'Package type is required (e.g. Document, Parcel, Box)'),
  weightKg: z.number().positive('Weight must be greater than 0 kg'),
  lengthCm: z.number().positive().optional().nullable(),
  widthCm: z.number().positive().optional().nullable(),
  heightCm: z.number().positive().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  declaredValue: z.number().int().nonnegative().optional().nullable(),
  isFragile: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.paymentType === PaymentType.COD) {
    if (!data.codAmount || data.codAmount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'COD amount must be greater than 0 for Cash on Delivery shipments',
        path: ['codAmount'],
      });
    }
  }
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const updateShipmentSchema = z.object({
  senderName: z.string().trim().min(2).optional(),
  senderPhone: z.string().trim().min(7).optional(),
  senderAddress: z.string().trim().min(5).optional(),
  senderCity: z.string().trim().min(2).optional(),
  senderAddressExtra: z.string().trim().optional().nullable(),

  receiverName: z.string().trim().min(2).optional(),
  receiverPhone: z.string().trim().min(7).optional(),
  receiverAddress: z.string().trim().min(5).optional(),
  receiverCity: z.string().trim().min(2).optional(),
  receiverAddressExtra: z.string().trim().optional().nullable(),

  packageType: z.string().trim().min(2).optional(),
  weightKg: z.number().positive().optional(),
  lengthCm: z.number().positive().optional().nullable(),
  widthCm: z.number().positive().optional().nullable(),
  heightCm: z.number().positive().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  declaredValue: z.number().int().nonnegative().optional().nullable(),
  isFragile: z.boolean().optional(),
});

export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;

export const statusTransitionSchema = z.object({
  toStatus: z.nativeEnum(ShipmentStatus, {
    errorMap: () => ({ message: 'A valid target status is required' }),
  }),
  hubId: z.string().optional(),
  note: z.string().trim().optional(),
});

export type StatusTransitionInput = z.infer<typeof statusTransitionSchema>;

export const deliverShipmentSchema = z.object({
  recipientName: z.string().trim().min(2, 'Recipient name is required').optional(),
  note: z.string().trim().optional(),
  proofImageUrl: z.string().url('Proof image must be a valid URL').optional().nullable(),
  amountCollected: z.number().int().nonnegative('Amount collected cannot be negative').optional(),
  discrepancyNote: z.string().trim().optional(),
});

export type DeliverShipmentInput = z.infer<typeof deliverShipmentSchema>;

export const deliveryFailureSchema = z.object({
  reason: z.nativeEnum(FailureReason, {
    errorMap: () => ({ message: 'A valid failure reason must be selected' }),
  }),
  note: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (data.reason === FailureReason.OTHER && (!data.note || data.note.trim().length < 3)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A descriptive note is required when failure reason is OTHER',
      path: ['note'],
    });
  }
});

export type DeliveryFailureInput = z.infer<typeof deliveryFailureSchema>;
