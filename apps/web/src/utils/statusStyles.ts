import { ShipmentStatus, PaymentStatus, Role, VehicleStatus, ServiceType } from '@eliteship/shared';
import { BadgeProps } from '../components/ui/Badge.js';

export type BadgeVariant = NonNullable<BadgeProps['variant']>;

export const SHIPMENT_STATUS_VARIANT: Record<string, BadgeVariant> = {
  [ShipmentStatus.CREATED]: 'default',
  [ShipmentStatus.PICKUP_SCHEDULED]: 'info',
  [ShipmentStatus.PICKED_UP]: 'info',
  [ShipmentStatus.AT_ORIGIN_HUB]: 'info',
  [ShipmentStatus.IN_TRANSIT]: 'info',
  [ShipmentStatus.AT_DESTINATION_HUB]: 'info',
  [ShipmentStatus.ASSIGNED_TO_DRIVER]: 'warning',
  [ShipmentStatus.OUT_FOR_DELIVERY]: 'warning',
  [ShipmentStatus.DELIVERED]: 'success',
  [ShipmentStatus.DELIVERY_FAILED]: 'danger',
  [ShipmentStatus.RESCHEDULED]: 'warning',
  [ShipmentStatus.CANCELLED]: 'danger',
  [ShipmentStatus.RETURNED]: 'default',
};

export const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  [ShipmentStatus.CREATED]: 'Created',
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
  [ShipmentStatus.RETURNED]: 'Returned',
};

export const PAYMENT_STATUS_VARIANT: Record<string, BadgeVariant> = {
  [PaymentStatus.PENDING]: 'warning',
  [PaymentStatus.COLLECTED]: 'success',
  [PaymentStatus.FAILED]: 'danger',
  [PaymentStatus.REFUNDED]: 'default',
};

export const ROLE_VARIANT: Record<string, BadgeVariant> = {
  [Role.ADMIN]: 'danger',
  [Role.HUB_STAFF]: 'info',
  [Role.DRIVER]: 'warning',
  [Role.CUSTOMER]: 'default',
};

export const VEHICLE_STATUS_VARIANT: Record<string, BadgeVariant> = {
  [VehicleStatus.AVAILABLE]: 'success',
  [VehicleStatus.ASSIGNED]: 'info',
  [VehicleStatus.IN_USE]: 'warning',
  [VehicleStatus.MAINTENANCE]: 'danger',
  [VehicleStatus.INACTIVE]: 'default',
};

export const SERVICE_TYPE_VARIANT: Record<string, BadgeVariant> = {
  [ServiceType.STANDARD]: 'default',
  [ServiceType.EXPRESS]: 'warning',
};

export function getShipmentStatusVariant(status: string): BadgeVariant {
  return SHIPMENT_STATUS_VARIANT[status] || 'default';
}

export function getShipmentStatusLabel(status: string): string {
  return SHIPMENT_STATUS_LABEL[status] || status.replace(/_/g, ' ');
}
