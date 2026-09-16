"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimatePricingSchema = exports.updatePricingRuleSchema = exports.createPricingRuleSchema = exports.updateVehicleSchema = exports.createVehicleSchema = exports.updateHubSchema = exports.createHubSchema = exports.assignDriverSchema = exports.deliveryFailureSchema = exports.deliverShipmentSchema = exports.statusTransitionSchema = exports.updateShipmentSchema = exports.createShipmentSchema = exports.adminCreateUserSchema = exports.loginSchema = exports.registerSchema = exports.ALLOWED_STATUS_TRANSITIONS = exports.MAX_DELIVERY_ATTEMPTS = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.FAILURE_REASON_LABELS = exports.STATUS_LABELS = exports.TRACKING_NUMBER_REGEX = exports.FailureReason = exports.VehicleStatus = exports.PaymentStatus = exports.PaymentType = exports.ServiceType = exports.ShipmentStatus = exports.Role = void 0;
exports.formatPKR = formatPKR;
exports.isValidTrackingNumber = isValidTrackingNumber;
exports.formatDateTimePST = formatDateTimePST;
exports.formatDatePST = formatDatePST;
exports.fractionToPercent = fractionToPercent;
exports.percentToFraction = percentToFraction;
exports.formatPercent = formatPercent;
const zod_1 = require("zod");
// â”€â”€â”€ Enums (re-declared inline â€” no local import needed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var Role;
(function (Role) {
    Role["ADMIN"] = "ADMIN";
    Role["HUB_STAFF"] = "HUB_STAFF";
    Role["DRIVER"] = "DRIVER";
    Role["CUSTOMER"] = "CUSTOMER";
})(Role || (exports.Role = Role = {}));
var ShipmentStatus;
(function (ShipmentStatus) {
    ShipmentStatus["CREATED"] = "CREATED";
    ShipmentStatus["PICKUP_SCHEDULED"] = "PICKUP_SCHEDULED";
    ShipmentStatus["PICKED_UP"] = "PICKED_UP";
    ShipmentStatus["AT_ORIGIN_HUB"] = "AT_ORIGIN_HUB";
    ShipmentStatus["IN_TRANSIT"] = "IN_TRANSIT";
    ShipmentStatus["AT_DESTINATION_HUB"] = "AT_DESTINATION_HUB";
    ShipmentStatus["ASSIGNED_TO_DRIVER"] = "ASSIGNED_TO_DRIVER";
    ShipmentStatus["OUT_FOR_DELIVERY"] = "OUT_FOR_DELIVERY";
    ShipmentStatus["DELIVERED"] = "DELIVERED";
    ShipmentStatus["DELIVERY_FAILED"] = "DELIVERY_FAILED";
    ShipmentStatus["RESCHEDULED"] = "RESCHEDULED";
    ShipmentStatus["CANCELLED"] = "CANCELLED";
    ShipmentStatus["RETURNED"] = "RETURNED";
})(ShipmentStatus || (exports.ShipmentStatus = ShipmentStatus = {}));
var ServiceType;
(function (ServiceType) {
    ServiceType["STANDARD"] = "STANDARD";
    ServiceType["EXPRESS"] = "EXPRESS";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
var PaymentType;
(function (PaymentType) {
    PaymentType["PREPAID"] = "PREPAID";
    PaymentType["COD"] = "COD";
})(PaymentType || (exports.PaymentType = PaymentType = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["COLLECTED"] = "COLLECTED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var VehicleStatus;
(function (VehicleStatus) {
    VehicleStatus["AVAILABLE"] = "AVAILABLE";
    VehicleStatus["ASSIGNED"] = "ASSIGNED";
    VehicleStatus["IN_USE"] = "IN_USE";
    VehicleStatus["MAINTENANCE"] = "MAINTENANCE";
    VehicleStatus["INACTIVE"] = "INACTIVE";
})(VehicleStatus || (exports.VehicleStatus = VehicleStatus = {}));
var FailureReason;
(function (FailureReason) {
    FailureReason["CUSTOMER_UNAVAILABLE"] = "CUSTOMER_UNAVAILABLE";
    FailureReason["WRONG_ADDRESS"] = "WRONG_ADDRESS";
    FailureReason["CUSTOMER_REFUSED"] = "CUSTOMER_REFUSED";
    FailureReason["PHONE_UNREACHABLE"] = "PHONE_UNREACHABLE";
    FailureReason["ADDRESS_INACCESSIBLE"] = "ADDRESS_INACCESSIBLE";
    FailureReason["OTHER"] = "OTHER";
})(FailureReason || (exports.FailureReason = FailureReason = {}));
// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.TRACKING_NUMBER_REGEX = /^[A-Z]{2,6}-\d{4}-\d{6}$/;
exports.STATUS_LABELS = {
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
exports.FAILURE_REASON_LABELS = {
    [FailureReason.CUSTOMER_UNAVAILABLE]: 'Customer Unavailable / Not Home',
    [FailureReason.WRONG_ADDRESS]: 'Incorrect or Incomplete Address',
    [FailureReason.CUSTOMER_REFUSED]: 'Customer Refused Delivery / Cancelled Order',
    [FailureReason.PHONE_UNREACHABLE]: 'Customer Phone Switched Off / Unreachable',
    [FailureReason.ADDRESS_INACCESSIBLE]: 'Area Inaccessible or Road Blocked',
    [FailureReason.OTHER]: 'Other (See Delivery Notes)',
};
exports.DEFAULT_PAGE_SIZE = 20;
exports.MAX_PAGE_SIZE = 100;
exports.MAX_DELIVERY_ATTEMPTS = 3;
exports.ALLOWED_STATUS_TRANSITIONS = {
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
function formatPKR(amount) {
    if (amount === null || amount === undefined || isNaN(amount))
        return 'Rs. 0';
    return `Rs. ${Math.round(amount).toLocaleString('en-PK')}`;
}
/** Validates whether a string matches the EliteShip tracking format */
function isValidTrackingNumber(trackingNumber) {
    return exports.TRACKING_NUMBER_REGEX.test(trackingNumber.trim());
}
/** Format a Date object or ISO string into localized Pakistan Standard Time */
function formatDateTimePST(date) {
    if (!date)
        return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime()))
        return '-';
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
function formatDatePST(date) {
    if (!date)
        return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime()))
        return '-';
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
function fractionToPercent(fraction) {
    if (fraction === null || fraction === undefined || isNaN(fraction))
        return 0;
    return Math.round((fraction * 100) * 10000) / 10000;
}
/**
 * Converts a human-typed percentage (e.g. 2 or 1.5) into stored fraction (e.g. 0.02 or 0.015).
 * Eliminates floating point noise (e.g. 0.015000000000000001 -> 0.015).
 */
function percentToFraction(percent) {
    if (percent === null || percent === undefined || isNaN(percent))
        return 0;
    return Math.round((percent / 100) * 1000000) / 1000000;
}
/**
 * Format a stored fraction as a human percentage string (e.g. 0.02 -> "2%", 0.015 -> "1.5%")
 */
function formatPercent(fraction) {
    const p = fractionToPercent(fraction);
    return `${p}%`;
}
// â”€â”€â”€ Auth schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().trim().toLowerCase().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters long'),
    fullName: zod_1.z.string().trim().min(2, 'Full name must be at least 2 characters'),
    phone: zod_1.z.string().trim().min(10, 'Valid phone number is required'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().toLowerCase().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.adminCreateUserSchema = zod_1.z.object({
    email: zod_1.z.string().trim().toLowerCase().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters long'),
    fullName: zod_1.z.string().trim().min(2, 'Full name must be at least 2 characters'),
    phone: zod_1.z.string().trim().optional(),
    role: zod_1.z.enum([Role.ADMIN, Role.HUB_STAFF, Role.DRIVER], {
        errorMap: () => ({ message: 'Staff role must be ADMIN, HUB_STAFF, or DRIVER' }),
    }),
    hubId: zod_1.z.string().optional(),
    homeHubId: zod_1.z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.role === Role.HUB_STAFF && !data.hubId) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'hubId is required for HUB_STAFF role',
            path: ['hubId'],
        });
    }
});
// â”€â”€â”€ Shipment schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    serviceType: zod_1.z.nativeEnum(ServiceType).default(ServiceType.STANDARD),
    paymentType: zod_1.z.nativeEnum(PaymentType),
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
    if (data.paymentType === PaymentType.COD) {
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
    toStatus: zod_1.z.nativeEnum(ShipmentStatus, {
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
    reason: zod_1.z.nativeEnum(FailureReason, {
        errorMap: () => ({ message: 'A valid failure reason must be selected' }),
    }),
    note: zod_1.z.string().trim().optional(),
}).superRefine((data, ctx) => {
    if (data.reason === FailureReason.OTHER && (!data.note || data.note.trim().length < 3)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'A descriptive note is required when failure reason is OTHER',
            path: ['note'],
        });
    }
});
// â”€â”€â”€ Driver schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.assignDriverSchema = zod_1.z.object({
    driverId: zod_1.z.string().min(1, 'Driver ID is required'),
});
// â”€â”€â”€ Hub schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.createHubSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Hub name is required'),
    code: zod_1.z.string().trim().min(2, 'Hub code is required (e.g. KHI-01)').toUpperCase(),
    address: zod_1.z.string().trim().min(5, 'Hub address is required'),
    city: zod_1.z.string().trim().min(2, 'City is required'),
    phone: zod_1.z.string().trim().optional().nullable(),
    latitude: zod_1.z.number().min(-90).max(90).optional().nullable(),
    longitude: zod_1.z.number().min(-180).max(180).optional().nullable(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateHubSchema = exports.createHubSchema.partial();
// â”€â”€â”€ Vehicle schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
exports.createVehicleSchema = zod_1.z.object({
    registrationNo: zod_1.z.string().trim().min(3, 'Registration number is required').toUpperCase(),
    type: zod_1.z.string().trim().min(2, 'Vehicle type is required (e.g. Motorcycle, Van, Pickup)'),
    makeModel: zod_1.z.string().trim().optional().nullable(),
    status: zod_1.z.nativeEnum(VehicleStatus).default(VehicleStatus.AVAILABLE),
    currentMileage: zod_1.z.number().int().nonnegative().optional().nullable(),
    notes: zod_1.z.string().trim().optional().nullable(),
    driverId: zod_1.z.string().optional().nullable(),
    hubId: zod_1.z.string().optional().nullable(),
});
exports.updateVehicleSchema = exports.createVehicleSchema.partial();
exports.createPricingRuleSchema = zod_1.z.object({
    serviceType: zod_1.z.nativeEnum(ServiceType),
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
    serviceType: zod_1.z.nativeEnum(ServiceType).default(ServiceType.STANDARD),
    originZone: zod_1.z.string().trim().min(1, 'Origin city is required'),
    destinationZone: zod_1.z.string().trim().min(1, 'Destination city is required'),
    weightKg: zod_1.z.number().positive('Weight must be greater than 0 kg'),
    paymentType: zod_1.z.nativeEnum(PaymentType).default(PaymentType.PREPAID),
    declaredOrCodAmount: zod_1.z.number().int().nonnegative().optional().default(0),
});
//# sourceMappingURL=browser.js.map