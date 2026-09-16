"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPKR = formatPKR;
exports.isValidTrackingNumber = isValidTrackingNumber;
exports.formatDateTimePST = formatDateTimePST;
exports.formatDatePST = formatDatePST;
exports.fractionToPercent = fractionToPercent;
exports.percentToFraction = percentToFraction;
exports.formatPercent = formatPercent;
const constants_js_1 = require("../constants.js");
/**
 * Format an integer amount into PKR currency string (e.g. "Rs. 1,500")
 */
function formatPKR(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return 'Rs. 0';
    }
    return `Rs. ${Math.round(amount).toLocaleString('en-PK')}`;
}
/**
 * Validates whether a string matches the EliteShip tracking format
 */
function isValidTrackingNumber(trackingNumber) {
    return constants_js_1.TRACKING_NUMBER_REGEX.test(trackingNumber.trim());
}
/**
 * Format a Date object or ISO string into localized Pakistan Standard Time
 */
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
/**
 * Format date only in PK format (e.g., "15 Sep 2026")
 */
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
//# sourceMappingURL=format.js.map