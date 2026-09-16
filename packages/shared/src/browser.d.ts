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
export declare enum Role {
    ADMIN = "ADMIN",
    HUB_STAFF = "HUB_STAFF",
    DRIVER = "DRIVER",
    CUSTOMER = "CUSTOMER"
}
export declare enum ShipmentStatus {
    CREATED = "CREATED",
    PICKUP_SCHEDULED = "PICKUP_SCHEDULED",
    PICKED_UP = "PICKED_UP",
    AT_ORIGIN_HUB = "AT_ORIGIN_HUB",
    IN_TRANSIT = "IN_TRANSIT",
    AT_DESTINATION_HUB = "AT_DESTINATION_HUB",
    ASSIGNED_TO_DRIVER = "ASSIGNED_TO_DRIVER",
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
    DELIVERED = "DELIVERED",
    DELIVERY_FAILED = "DELIVERY_FAILED",
    RESCHEDULED = "RESCHEDULED",
    CANCELLED = "CANCELLED",
    RETURNED = "RETURNED"
}
export declare enum ServiceType {
    STANDARD = "STANDARD",
    EXPRESS = "EXPRESS"
}
export declare enum PaymentType {
    PREPAID = "PREPAID",
    COD = "COD"
}
export declare enum PaymentStatus {
    PENDING = "PENDING",
    COLLECTED = "COLLECTED",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED"
}
export declare enum VehicleStatus {
    AVAILABLE = "AVAILABLE",
    ASSIGNED = "ASSIGNED",
    IN_USE = "IN_USE",
    MAINTENANCE = "MAINTENANCE",
    INACTIVE = "INACTIVE"
}
export declare enum FailureReason {
    CUSTOMER_UNAVAILABLE = "CUSTOMER_UNAVAILABLE",
    WRONG_ADDRESS = "WRONG_ADDRESS",
    CUSTOMER_REFUSED = "CUSTOMER_REFUSED",
    PHONE_UNREACHABLE = "PHONE_UNREACHABLE",
    ADDRESS_INACCESSIBLE = "ADDRESS_INACCESSIBLE",
    OTHER = "OTHER"
}
export declare const TRACKING_NUMBER_REGEX: RegExp;
export declare const STATUS_LABELS: Record<ShipmentStatus, string>;
export declare const FAILURE_REASON_LABELS: Record<FailureReason, string>;
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 100;
export declare const MAX_DELIVERY_ATTEMPTS = 3;
export declare const ALLOWED_STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]>;
/** Format an integer amount into PKR currency string (e.g. "Rs. 1,500") */
export declare function formatPKR(amount: number | null | undefined): string;
/** Validates whether a string matches the EliteShip tracking format */
export declare function isValidTrackingNumber(trackingNumber: string): boolean;
/** Format a Date object or ISO string into localized Pakistan Standard Time */
export declare function formatDateTimePST(date: Date | string | null | undefined): string;
/** Format date only in PK format (e.g., "15 Sep 2026") */
export declare function formatDatePST(date: Date | string | null | undefined): string;
/**
 * Converts a fractional fee rate (stored in DB, e.g. 0.02) to human-readable percentage (e.g. 2).
 * Eliminates floating point noise (e.g. 0.021999999999999998 -> 2.2).
 */
export declare function fractionToPercent(fraction: number | null | undefined): number;
/**
 * Converts a human-typed percentage (e.g. 2 or 1.5) into stored fraction (e.g. 0.02 or 0.015).
 * Eliminates floating point noise (e.g. 0.015000000000000001 -> 0.015).
 */
export declare function percentToFraction(percent: number | null | undefined): number;
/**
 * Format a stored fraction as a human percentage string (e.g. 0.02 -> "2%", 0.015 -> "1.5%")
 */
export declare function formatPercent(fraction: number | null | undefined): string;
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
export declare const createShipmentSchema: z.ZodEffects<z.ZodObject<{
    senderName: z.ZodString;
    senderPhone: z.ZodString;
    senderAddress: z.ZodString;
    senderCity: z.ZodString;
    senderAddressExtra: z.ZodOptional<z.ZodString>;
    receiverName: z.ZodString;
    receiverPhone: z.ZodString;
    receiverAddress: z.ZodString;
    receiverCity: z.ZodString;
    receiverAddressExtra: z.ZodOptional<z.ZodString>;
    originHubId: z.ZodOptional<z.ZodString>;
    destinationHubId: z.ZodOptional<z.ZodString>;
    serviceType: z.ZodDefault<z.ZodNativeEnum<typeof ServiceType>>;
    paymentType: z.ZodNativeEnum<typeof PaymentType>;
    codAmount: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    packageType: z.ZodString;
    weightKg: z.ZodNumber;
    lengthCm: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    widthCm: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    heightCm: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    declaredValue: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    isFragile: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    senderName: string;
    senderPhone: string;
    senderAddress: string;
    senderCity: string;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    receiverCity: string;
    serviceType: ServiceType;
    paymentType: PaymentType;
    packageType: string;
    weightKg: number;
    isFragile: boolean;
    senderAddressExtra?: string | undefined;
    receiverAddressExtra?: string | undefined;
    originHubId?: string | undefined;
    destinationHubId?: string | undefined;
    codAmount?: number | null | undefined;
    lengthCm?: number | null | undefined;
    widthCm?: number | null | undefined;
    heightCm?: number | null | undefined;
    description?: string | null | undefined;
    declaredValue?: number | null | undefined;
}, {
    senderName: string;
    senderPhone: string;
    senderAddress: string;
    senderCity: string;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    receiverCity: string;
    paymentType: PaymentType;
    packageType: string;
    weightKg: number;
    senderAddressExtra?: string | undefined;
    receiverAddressExtra?: string | undefined;
    originHubId?: string | undefined;
    destinationHubId?: string | undefined;
    serviceType?: ServiceType | undefined;
    codAmount?: number | null | undefined;
    lengthCm?: number | null | undefined;
    widthCm?: number | null | undefined;
    heightCm?: number | null | undefined;
    description?: string | null | undefined;
    declaredValue?: number | null | undefined;
    isFragile?: boolean | undefined;
}>, {
    senderName: string;
    senderPhone: string;
    senderAddress: string;
    senderCity: string;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    receiverCity: string;
    serviceType: ServiceType;
    paymentType: PaymentType;
    packageType: string;
    weightKg: number;
    isFragile: boolean;
    senderAddressExtra?: string | undefined;
    receiverAddressExtra?: string | undefined;
    originHubId?: string | undefined;
    destinationHubId?: string | undefined;
    codAmount?: number | null | undefined;
    lengthCm?: number | null | undefined;
    widthCm?: number | null | undefined;
    heightCm?: number | null | undefined;
    description?: string | null | undefined;
    declaredValue?: number | null | undefined;
}, {
    senderName: string;
    senderPhone: string;
    senderAddress: string;
    senderCity: string;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    receiverCity: string;
    paymentType: PaymentType;
    packageType: string;
    weightKg: number;
    senderAddressExtra?: string | undefined;
    receiverAddressExtra?: string | undefined;
    originHubId?: string | undefined;
    destinationHubId?: string | undefined;
    serviceType?: ServiceType | undefined;
    codAmount?: number | null | undefined;
    lengthCm?: number | null | undefined;
    widthCm?: number | null | undefined;
    heightCm?: number | null | undefined;
    description?: string | null | undefined;
    declaredValue?: number | null | undefined;
    isFragile?: boolean | undefined;
}>;
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export declare const updateShipmentSchema: z.ZodObject<{
    senderName: z.ZodOptional<z.ZodString>;
    senderPhone: z.ZodOptional<z.ZodString>;
    senderAddress: z.ZodOptional<z.ZodString>;
    senderCity: z.ZodOptional<z.ZodString>;
    senderAddressExtra: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    receiverName: z.ZodOptional<z.ZodString>;
    receiverPhone: z.ZodOptional<z.ZodString>;
    receiverAddress: z.ZodOptional<z.ZodString>;
    receiverCity: z.ZodOptional<z.ZodString>;
    receiverAddressExtra: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    packageType: z.ZodOptional<z.ZodString>;
    weightKg: z.ZodOptional<z.ZodNumber>;
    lengthCm: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    widthCm: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    heightCm: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    declaredValue: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    isFragile: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    senderName?: string | undefined;
    senderPhone?: string | undefined;
    senderAddress?: string | undefined;
    senderCity?: string | undefined;
    senderAddressExtra?: string | null | undefined;
    receiverName?: string | undefined;
    receiverPhone?: string | undefined;
    receiverAddress?: string | undefined;
    receiverCity?: string | undefined;
    receiverAddressExtra?: string | null | undefined;
    packageType?: string | undefined;
    weightKg?: number | undefined;
    lengthCm?: number | null | undefined;
    widthCm?: number | null | undefined;
    heightCm?: number | null | undefined;
    description?: string | null | undefined;
    declaredValue?: number | null | undefined;
    isFragile?: boolean | undefined;
}, {
    senderName?: string | undefined;
    senderPhone?: string | undefined;
    senderAddress?: string | undefined;
    senderCity?: string | undefined;
    senderAddressExtra?: string | null | undefined;
    receiverName?: string | undefined;
    receiverPhone?: string | undefined;
    receiverAddress?: string | undefined;
    receiverCity?: string | undefined;
    receiverAddressExtra?: string | null | undefined;
    packageType?: string | undefined;
    weightKg?: number | undefined;
    lengthCm?: number | null | undefined;
    widthCm?: number | null | undefined;
    heightCm?: number | null | undefined;
    description?: string | null | undefined;
    declaredValue?: number | null | undefined;
    isFragile?: boolean | undefined;
}>;
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
export declare const statusTransitionSchema: z.ZodObject<{
    toStatus: z.ZodNativeEnum<typeof ShipmentStatus>;
    hubId: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    toStatus: ShipmentStatus;
    hubId?: string | undefined;
    note?: string | undefined;
}, {
    toStatus: ShipmentStatus;
    hubId?: string | undefined;
    note?: string | undefined;
}>;
export type StatusTransitionInput = z.infer<typeof statusTransitionSchema>;
export declare const deliverShipmentSchema: z.ZodObject<{
    recipientName: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
    proofImageUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    amountCollected: z.ZodOptional<z.ZodNumber>;
    discrepancyNote: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
    recipientName?: string | undefined;
    proofImageUrl?: string | null | undefined;
    amountCollected?: number | undefined;
    discrepancyNote?: string | undefined;
}, {
    note?: string | undefined;
    recipientName?: string | undefined;
    proofImageUrl?: string | null | undefined;
    amountCollected?: number | undefined;
    discrepancyNote?: string | undefined;
}>;
export type DeliverShipmentInput = z.infer<typeof deliverShipmentSchema>;
export declare const deliveryFailureSchema: z.ZodEffects<z.ZodObject<{
    reason: z.ZodNativeEnum<typeof FailureReason>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason: FailureReason;
    note?: string | undefined;
}, {
    reason: FailureReason;
    note?: string | undefined;
}>, {
    reason: FailureReason;
    note?: string | undefined;
}, {
    reason: FailureReason;
    note?: string | undefined;
}>;
export type DeliveryFailureInput = z.infer<typeof deliveryFailureSchema>;
export declare const assignDriverSchema: z.ZodObject<{
    driverId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    driverId: string;
}, {
    driverId: string;
}>;
export type AssignDriverInput = z.infer<typeof assignDriverSchema>;
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
//# sourceMappingURL=browser.d.ts.map