/**
 * Format an integer amount into PKR currency string (e.g. "Rs. 1,500")
 */
export declare function formatPKR(amount: number | null | undefined): string;
/**
 * Validates whether a string matches the EliteShip tracking format
 */
export declare function isValidTrackingNumber(trackingNumber: string): boolean;
/**
 * Format a Date object or ISO string into localized Pakistan Standard Time
 */
export declare function formatDateTimePST(date: Date | string | null | undefined): string;
/**
 * Format date only in PK format (e.g., "15 Sep 2026")
 */
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
//# sourceMappingURL=format.d.ts.map