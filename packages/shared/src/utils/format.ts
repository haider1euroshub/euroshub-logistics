import { TRACKING_NUMBER_REGEX } from '../constants.js';

/**
 * Format an integer amount into PKR currency string (e.g. "Rs. 1,500")
 */
export function formatPKR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rs. 0';
  }
  return `Rs. ${Math.round(amount).toLocaleString('en-PK')}`;
}

/**
 * Validates whether a string matches the EliteShip tracking format
 */
export function isValidTrackingNumber(trackingNumber: string): boolean {
  return TRACKING_NUMBER_REGEX.test(trackingNumber.trim());
}

/**
 * Format a Date object or ISO string into localized Pakistan Standard Time
 */
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

/**
 * Format date only in PK format (e.g., "15 Sep 2026")
 */
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

