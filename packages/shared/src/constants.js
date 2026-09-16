"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_STATUS_TRANSITIONS = exports.MAX_DELIVERY_ATTEMPTS = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.FAILURE_REASON_LABELS = exports.STATUS_LABELS = exports.TRACKING_NUMBER_REGEX = void 0;
const enums_js_1 = require("./enums.js");
exports.TRACKING_NUMBER_REGEX = /^[A-Z]{2,6}-\d{4}-\d{6}$/;
exports.STATUS_LABELS = {
    [enums_js_1.ShipmentStatus.CREATED]: 'Order Created',
    [enums_js_1.ShipmentStatus.PICKUP_SCHEDULED]: 'Pickup Scheduled',
    [enums_js_1.ShipmentStatus.PICKED_UP]: 'Picked Up',
    [enums_js_1.ShipmentStatus.AT_ORIGIN_HUB]: 'At Origin Hub',
    [enums_js_1.ShipmentStatus.IN_TRANSIT]: 'In Transit',
    [enums_js_1.ShipmentStatus.AT_DESTINATION_HUB]: 'At Destination Hub',
    [enums_js_1.ShipmentStatus.ASSIGNED_TO_DRIVER]: 'Assigned to Driver',
    [enums_js_1.ShipmentStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
    [enums_js_1.ShipmentStatus.DELIVERED]: 'Delivered',
    [enums_js_1.ShipmentStatus.DELIVERY_FAILED]: 'Delivery Failed',
    [enums_js_1.ShipmentStatus.RESCHEDULED]: 'Rescheduled',
    [enums_js_1.ShipmentStatus.CANCELLED]: 'Cancelled',
    [enums_js_1.ShipmentStatus.RETURNED]: 'Returned to Sender',
};
exports.FAILURE_REASON_LABELS = {
    [enums_js_1.FailureReason.CUSTOMER_UNAVAILABLE]: 'Customer Unavailable / Not Home',
    [enums_js_1.FailureReason.WRONG_ADDRESS]: 'Incorrect or Incomplete Address',
    [enums_js_1.FailureReason.CUSTOMER_REFUSED]: 'Customer Refused Delivery / Cancelled Order',
    [enums_js_1.FailureReason.PHONE_UNREACHABLE]: 'Customer Phone Switched Off / Unreachable',
    [enums_js_1.FailureReason.ADDRESS_INACCESSIBLE]: 'Area Inaccessible or Road Blocked',
    [enums_js_1.FailureReason.OTHER]: 'Other (See Delivery Notes)',
};
exports.DEFAULT_PAGE_SIZE = 20;
exports.MAX_PAGE_SIZE = 100;
exports.MAX_DELIVERY_ATTEMPTS = 3;
// State machine allowed transitions per Section 6.2
exports.ALLOWED_STATUS_TRANSITIONS = {
    [enums_js_1.ShipmentStatus.CREATED]: [
        enums_js_1.ShipmentStatus.PICKUP_SCHEDULED,
        enums_js_1.ShipmentStatus.CANCELLED,
    ],
    [enums_js_1.ShipmentStatus.PICKUP_SCHEDULED]: [
        enums_js_1.ShipmentStatus.PICKED_UP,
        enums_js_1.ShipmentStatus.CANCELLED,
    ],
    [enums_js_1.ShipmentStatus.PICKED_UP]: [
        enums_js_1.ShipmentStatus.AT_ORIGIN_HUB,
    ],
    [enums_js_1.ShipmentStatus.AT_ORIGIN_HUB]: [
        enums_js_1.ShipmentStatus.IN_TRANSIT,
    ],
    [enums_js_1.ShipmentStatus.IN_TRANSIT]: [
        enums_js_1.ShipmentStatus.AT_DESTINATION_HUB,
        enums_js_1.ShipmentStatus.AT_ORIGIN_HUB, // Intermediate hub re-entry leg
    ],
    [enums_js_1.ShipmentStatus.AT_DESTINATION_HUB]: [
        enums_js_1.ShipmentStatus.ASSIGNED_TO_DRIVER,
    ],
    [enums_js_1.ShipmentStatus.ASSIGNED_TO_DRIVER]: [
        enums_js_1.ShipmentStatus.OUT_FOR_DELIVERY,
    ],
    [enums_js_1.ShipmentStatus.OUT_FOR_DELIVERY]: [
        enums_js_1.ShipmentStatus.DELIVERED,
        enums_js_1.ShipmentStatus.DELIVERY_FAILED,
    ],
    [enums_js_1.ShipmentStatus.DELIVERY_FAILED]: [
        enums_js_1.ShipmentStatus.RESCHEDULED,
        enums_js_1.ShipmentStatus.RETURNED,
    ],
    [enums_js_1.ShipmentStatus.RESCHEDULED]: [
        enums_js_1.ShipmentStatus.OUT_FOR_DELIVERY,
    ],
    [enums_js_1.ShipmentStatus.DELIVERED]: [],
    [enums_js_1.ShipmentStatus.CANCELLED]: [],
    [enums_js_1.ShipmentStatus.RETURNED]: [],
};
//# sourceMappingURL=constants.js.map