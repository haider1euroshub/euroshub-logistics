import { ShipmentStatus, FailureReason } from './enums.js';

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

// State machine allowed transitions per Section 6.2
export const ALLOWED_STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  [ShipmentStatus.CREATED]: [
    ShipmentStatus.PICKUP_SCHEDULED,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.PICKUP_SCHEDULED]: [
    ShipmentStatus.PICKED_UP,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.PICKED_UP]: [
    ShipmentStatus.AT_ORIGIN_HUB,
  ],
  [ShipmentStatus.AT_ORIGIN_HUB]: [
    ShipmentStatus.IN_TRANSIT,
  ],
  [ShipmentStatus.IN_TRANSIT]: [
    ShipmentStatus.AT_DESTINATION_HUB,
    ShipmentStatus.AT_ORIGIN_HUB, // Intermediate hub re-entry leg
  ],
  [ShipmentStatus.AT_DESTINATION_HUB]: [
    ShipmentStatus.ASSIGNED_TO_DRIVER,
  ],
  [ShipmentStatus.ASSIGNED_TO_DRIVER]: [
    ShipmentStatus.OUT_FOR_DELIVERY,
  ],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [
    ShipmentStatus.DELIVERED,
    ShipmentStatus.DELIVERY_FAILED,
  ],
  [ShipmentStatus.DELIVERY_FAILED]: [
    ShipmentStatus.RESCHEDULED,
    ShipmentStatus.RETURNED,
  ],
  [ShipmentStatus.RESCHEDULED]: [
    ShipmentStatus.OUT_FOR_DELIVERY,
  ],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.CANCELLED]: [],
  [ShipmentStatus.RETURNED]: [],
};
