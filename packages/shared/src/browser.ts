/**
 * Browser/ESM barrel for @eliteship/shared.
 *
 * This file is the ONLY shared entry point for the Vite/React frontend.
 * It is 100% self-contained: the ONLY import is `zod` (an external package).
 * There are NO relative imports from within the shared/src tree.
 *
 * WHY: Rollup's binding-analysis pass resolves relative imports (even without
 * .js extension) to the compiled .js (CJS) sibling files that sit next to the
 * .ts sources, because the plugin resolveId hook is not invoked during that
 * pass. Any import that touches a CJS file breaks Rollup's static export
 * tracing, making named exports disappear.
 *
 * Solution: declare everything inline here. The enums are re-declared (not
 * re-exported) so Rollup sees them as fresh ESM-native exports from this file.
 *
 * The Node.js API server continues to use index.ts -> compiled CJS output.
 * TypeScript type-checks both paths against the same source of truth.
 *
 * MAINTENANCE: mirror any changes to enums.ts, constants.ts, format.ts, or
 * schemas/*.ts in this file as well.
 */

import { z } from 'zod';

// â”€â”€â”€ Enums (re-declared inline â€” no local import needed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export enum Role {
  ADMIN = 'ADMIN',
  HUB_STAFF = 'HUB_STAFF',
  DRIVER = 'DRIVER',
  CUSTOMER = 'CUSTOMER',
}

export enum ShipmentStatus {
  CREATED = 'CREATED',
  PICKUP_SCHEDULED = 'PICKUP_SCHEDULED',
  PICKED_UP = 'PICKED_UP',
  AT_ORIGIN_HUB = 'AT_ORIGIN_HUB',
  IN_TRANSIT = 'IN_TRANSIT',
  AT_DESTINATION_HUB = 'AT_DESTINATION_HUB',
  ASSIGNED_TO_DRIVER = 'ASSIGNED_TO_DRIVER',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  DELIVERY_FAILED = 'DELIVERY_FAILED',
  RESCHEDULED = 'RESCHEDULED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

export enum ServiceType {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
}

export enum PaymentType {
  PREPAID = 'PREPAID',
  COD = 'COD',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COLLECTED = 'COLLECTED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

export enum FailureReason {
  CUSTOMER_UNAVAILABLE = 'CUSTOMER_UNAVAILABLE',
  WRONG_ADDRESS = 'WRONG_ADDRESS',
  CUSTOMER_REFUSED = 'CUSTOMER_REFUSED',
  PHONE_UNREACHABLE = 'PHONE_UNREACHABLE',
  ADDRESS_INACCESSIBLE = 'ADDRESS_INACCESSIBLE',
  OTHER = 'OTHER',
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const TRACKING_NUMBER_REGEX = /^[A-Z]{2,6}-\d{4}-\d{6}$/;

export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  [ShipmentStatus.CREATED]: 'Order Created',
  [ShipmentStatus.PICKUP_SCHEDULED]: 'Pickup Scheduled',
  [ShipmentStatus.PICKED_UP]: 'Picked Up',
  [ShipmentStatus.AT_ORIGIN_HUB]: 'At Origin Hub',
  [ShipmentStatus.IN_TRANSIT]: 'In Transit',
  [ShipmentStatus.AT_DESTINATION_HUB]: 'At Destination Hub',
  [ShipmentStatus.ASSIGNED_TO_DRIVER]: 'Assigned to Driver',
  [ShipmentStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [ShipmentStatus.DELIVERED]: 'Delivered',
  [ShipmentStatus.DELIVERY_FAILED]: 'Delivery Failed',
  [ShipmentStatus.RESCHEDULED]: 'Rescheduled',
  [ShipmentStatus.CANCELLED]: 'Cancelled',
  [ShipmentStatus.RETURNED]: 'Returned to Sender',
};

export const FAILURE_REASON_LABELS: Record<FailureReason, string> = {
  [FailureReason.CUSTOMER_UNAVAILABLE]: 'Customer Unavailable / Not Home',
  [FailureReason.WRONG_ADDRESS]: 'Incorrect or Incomplete Address',
  [FailureReason.CUSTOMER_REFUSED]: 'Customer Refused Delivery / Cancelled Order',
  [FailureReason.PHONE_UNREACHABLE]: 'Customer Phone Switched Off / Unreachable',
  [FailureReason.ADDRESS_INACCESSIBLE]: 'Area Inaccessible or Road Blocked',
  [FailureReason.OTHER]: 'Other (See Delivery Notes)',
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_DELIVERY_ATTEMPTS = 3;

export const ALLOWED_STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  [ShipmentStatus.CREATED]: [ShipmentStatus.PICKUP_SCHEDULED, ShipmentStatus.CANCELLED],
  [ShipmentStatus.PICKUP_SCHEDULED]: [ShipmentStatus.PICKED_UP, ShipmentStatus.CANCELLED],
  [ShipmentStatus.PICKED_UP]: [ShipmentStatus.AT_ORIGIN_HUB],
  [ShipmentStatus.AT_ORIGIN_HUB]: [ShipmentStatus.IN_TRANSIT],
  [ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.AT_DESTINATION_HUB, ShipmentStatus.AT_ORIGIN_HUB],
  [ShipmentStatus.AT_DESTINATION_HUB]: [ShipmentStatus.ASSIGNED_TO_DRIVER],
  [ShipmentStatus.ASSIGNED_TO_DRIVER]: [ShipmentStatus.OUT_FOR_DELIVERY],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED],
  [ShipmentStatus.DELIVERY_FAILED]: [ShipmentStatus.RESCHEDULED, ShipmentStatus.RETURNED],
  [ShipmentStatus.RESCHEDULED]: [ShipmentStatus.OUT_FOR_DELIVERY],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.CANCELLED]: [],
  [ShipmentStatus.RETURNED]: [],
};

// â”€â”€â”€ Format utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/** Format an integer amount into PKR currency string (e.g. "Rs. 1,500") */
export function formatPKR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rs. 0';
  return `Rs. ${Math.round(amount).toLocaleString('en-PK')}`;
}

/** Validates whether a string matches the EliteShip tracking format */
export function isValidTrackingNumber(trackingNumber: string): boolean {
  return TRACKING_NUMBER_REGEX.test(trackingNumber.trim());
}

/** Format a Date object or ISO string into localized Pakistan Standard Time */
export function formatDateTimePST(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/** Format date only in PK format (e.g., "15 Sep 2026") */
export function formatDatePST(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(d);
}

/**
 * Converts a fractional fee rate (stored in DB, e.g. 0.02) to human-readable percentage (e.g. 2).
 * Eliminates floating point noise (e.g. 0.021999999999999998 -> 2.2).
 */
export function fractionToPercent(fraction: number | null | undefined): number {
  if (fraction === null || fraction === undefined || isNaN(fraction)) return 0;
  return Math.round((fraction * 100) * 10000) / 10000;
}

/**
 * Converts a human-typed percentage (e.g. 2 or 1.5) into stored fraction (e.g. 0.02 or 0.015).
 * Eliminates floating point noise (e.g. 0.015000000000000001 -> 0.015).
 */
export function percentToFraction(percent: number | null | undefined): number {
  if (percent === null || percent === undefined || isNaN(percent)) return 0;
  return Math.round((percent / 100) * 1000000) / 1000000;
}

/**
 * Format a stored fraction as a human percentage string (e.g. 0.02 -> "2%", 0.015 -> "1.5%")
 */
export function formatPercent(fraction: number | null | undefined): string {
  const p = fractionToPercent(fraction);
  return `${p}%`;
}


// â”€â”€â”€ Auth schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  hubId: z.string().optional(),
  homeHubId: z.string().optional(),
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

// â”€â”€â”€ Shipment schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Driver schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const assignDriverSchema = z.object({
  driverId: z.string().min(1, 'Driver ID is required'),
});
export type AssignDriverInput = z.infer<typeof assignDriverSchema>;

// â”€â”€â”€ Hub schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createHubSchema = z.object({
  name: z.string().trim().min(2, 'Hub name is required'),
  code: z.string().trim().min(2, 'Hub code is required (e.g. KHI-01)').toUpperCase(),
  address: z.string().trim().min(5, 'Hub address is required'),
  city: z.string().trim().min(2, 'City is required'),
  phone: z.string().trim().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  isActive: z.boolean().default(true),
});
export type CreateHubInput = z.infer<typeof createHubSchema>;
export const updateHubSchema = createHubSchema.partial();
export type UpdateHubInput = z.infer<typeof updateHubSchema>;

// â”€â”€â”€ Vehicle schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createVehicleSchema = z.object({
  registrationNo: z.string().trim().min(3, 'Registration number is required').toUpperCase(),
  type: z.string().trim().min(2, 'Vehicle type is required (e.g. Motorcycle, Van, Pickup)'),
  makeModel: z.string().trim().optional().nullable(),
  status: z.nativeEnum(VehicleStatus).default(VehicleStatus.AVAILABLE),
  currentMileage: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  driverId: z.string().optional().nullable(),
  hubId: z.string().optional().nullable(),
});
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export const updateVehicleSchema = createVehicleSchema.partial();
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

// â”€â”€â”€ Pricing schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  originZone: z.string().trim().min(1, 'Origin city is required'),
  destinationZone: z.string().trim().min(1, 'Destination city is required'),
  weightKg: z.number().positive('Weight must be greater than 0 kg'),
  paymentType: z.nativeEnum(PaymentType).default(PaymentType.PREPAID),
  declaredOrCodAmount: z.number().int().nonnegative().optional().default(0),
});
export type EstimatePricingInput = z.infer<typeof estimatePricingSchema>;
