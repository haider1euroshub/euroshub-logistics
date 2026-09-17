import React from 'react';
import { Badge, BadgeProps } from './Badge.js';
import {
  getShipmentStatusVariant,
  getShipmentStatusLabel,
  PAYMENT_STATUS_VARIANT,
  ROLE_VARIANT,
  VEHICLE_STATUS_VARIANT,
  SERVICE_TYPE_VARIANT,
  BadgeVariant,
} from '../../utils/statusStyles.js';

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: string;
  type?: 'shipment' | 'payment' | 'role' | 'vehicle' | 'service';
  customLabel?: string;
  variant?: BadgeVariant;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'shipment',
  customLabel,
  variant: explicitVariant,
  size = 'sm',
  className,
  ...props
}) => {
  let resolvedVariant: BadgeVariant = 'default';
  let resolvedLabel = customLabel || status;

  if (explicitVariant) {
    resolvedVariant = explicitVariant;
  } else {
    switch (type) {
      case 'shipment':
        resolvedVariant = getShipmentStatusVariant(status);
        resolvedLabel = customLabel || getShipmentStatusLabel(status);
        break;
      case 'payment':
        resolvedVariant = PAYMENT_STATUS_VARIANT[status] || 'default';
        break;
      case 'role':
        resolvedVariant = ROLE_VARIANT[status] || 'default';
        break;
      case 'vehicle':
        resolvedVariant = VEHICLE_STATUS_VARIANT[status] || 'default';
        break;
      case 'service':
        resolvedVariant = SERVICE_TYPE_VARIANT[status] || 'default';
        break;
      default:
        resolvedVariant = getShipmentStatusVariant(status);
    }
  }

  return (
    <Badge variant={resolvedVariant} size={size} className={className} {...props}>
      {resolvedLabel}
    </Badge>
  );
};
