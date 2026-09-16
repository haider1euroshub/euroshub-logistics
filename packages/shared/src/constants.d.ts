import { ShipmentStatus, FailureReason } from './enums.js';
export declare const TRACKING_NUMBER_REGEX: RegExp;
export declare const STATUS_LABELS: Record<ShipmentStatus, string>;
export declare const FAILURE_REASON_LABELS: Record<FailureReason, string>;
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 100;
export declare const MAX_DELIVERY_ATTEMPTS = 3;
export declare const ALLOWED_STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]>;
//# sourceMappingURL=constants.d.ts.map