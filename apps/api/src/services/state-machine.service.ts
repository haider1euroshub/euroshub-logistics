import { Role, ShipmentStatus, Shipment, User } from '@prisma/client';
import { ALLOWED_STATUS_TRANSITIONS } from '@eliteship/shared';
import { AppError } from '../middleware/error-handler.js';
import { prisma } from '../lib/prisma.js';

export class StateMachineService {
  /**
   * Validate whether a status transition is permitted by the state machine and the actor role/scope
   */
  static async validateTransition(params: {
    shipment: Shipment & {
      customer?: { userId: string } | null;
      currentAssignedDriver?: { id: string; userId: string } | null;
    };
    toStatus: ShipmentStatus;
    actor: User & {
      hubStaffProfile?: { hubId: string } | null;
      driverProfile?: { id: string } | null;
    };
    targetHubId?: string;
  }): Promise<void> {
    const { shipment, toStatus, actor, targetHubId } = params;
    const fromStatus = shipment.status;

    // 1. Is transition defined in ALLOWED_STATUS_TRANSITIONS?
    const allowedTargets: string[] = (ALLOWED_STATUS_TRANSITIONS as any)[fromStatus] || [];
    const isGraphAllowed = allowedTargets.includes(toStatus as string);

    if (!isGraphAllowed) {
      // Log rejected attempt to AuditLog
      await prisma.auditLog.create({
        data: {
          actorUserId: actor.id,
          actorRole: actor.role,
          action: 'STATUS_TRANSITION_REJECTED',
          entityType: 'Shipment',
          entityId: shipment.id,
          metadataJson: {
            fromStatus,
            toStatus,
            reason: 'ILLEGAL_STATE_TRANSITION',
          },
        },
      });

      throw new AppError(
        `Cannot move shipment from ${fromStatus} to ${toStatus}.`,
        409,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // 2. Validate actor authorization for this specific transition per Section 6.3
    const role = actor.role;

    if (role === Role.ADMIN) {
      // Admin can trigger all allowed transitions
      return;
    }

    let isAuthorized = false;

    if (fromStatus === ShipmentStatus.CREATED && toStatus === ShipmentStatus.PICKUP_SCHEDULED) {
      // ADMIN, HUB_STAFF (at origin hub)
      if (role === Role.HUB_STAFF && actor.hubStaffProfile?.hubId === shipment.originHubId) {
        isAuthorized = true;
      }
    } else if (fromStatus === ShipmentStatus.PICKUP_SCHEDULED && toStatus === ShipmentStatus.PICKED_UP) {
      // Assigned DRIVER or ADMIN
      if (role === Role.DRIVER && shipment.currentAssignedDriverId === actor.driverProfile?.id) {
        isAuthorized = true;
      }
    } else if (fromStatus === ShipmentStatus.PICKED_UP && toStatus === ShipmentStatus.AT_ORIGIN_HUB) {
      // HUB_STAFF at that hub
      const effectiveHubId = targetHubId || shipment.originHubId;
      if (role === Role.HUB_STAFF && actor.hubStaffProfile?.hubId === effectiveHubId) {
        isAuthorized = true;
      }
    } else if (fromStatus === ShipmentStatus.AT_ORIGIN_HUB && toStatus === ShipmentStatus.IN_TRANSIT) {
      // HUB_STAFF at origin hub
      if (role === Role.HUB_STAFF && actor.hubStaffProfile?.hubId === shipment.originHubId) {
        isAuthorized = true;
      }
    } else if (fromStatus === ShipmentStatus.IN_TRANSIT && toStatus === ShipmentStatus.AT_DESTINATION_HUB) {
      // HUB_STAFF at destination hub
      const effectiveHubId = targetHubId || shipment.destinationHubId;
      if (role === Role.HUB_STAFF && actor.hubStaffProfile?.hubId === effectiveHubId) {
        isAuthorized = true;
      }
    } else if (fromStatus === ShipmentStatus.IN_TRANSIT && toStatus === ShipmentStatus.AT_ORIGIN_HUB) {
      // Intermediate hub arrival
      if (role === Role.HUB_STAFF && targetHubId && actor.hubStaffProfile?.hubId === targetHubId) {
        isAuthorized = true;
      }
    } else if (fromStatus === ShipmentStatus.AT_DESTINATION_HUB && toStatus === ShipmentStatus.ASSIGNED_TO_DRIVER) {
      // HUB_STAFF at destination hub
      if (role === Role.HUB_STAFF && actor.hubStaffProfile?.hubId === shipment.destinationHubId) {
        isAuthorized = true;
      }
    } else if (fromStatus === ShipmentStatus.ASSIGNED_TO_DRIVER && toStatus === ShipmentStatus.OUT_FOR_DELIVERY) {
      // Assigned DRIVER
      if (role === Role.DRIVER && shipment.currentAssignedDriverId === actor.driverProfile?.id) {
        isAuthorized = true;
      }
    } else if (
      fromStatus === ShipmentStatus.OUT_FOR_DELIVERY &&
      (toStatus === ShipmentStatus.DELIVERED || toStatus === ShipmentStatus.DELIVERY_FAILED)
    ) {
      // Assigned DRIVER
      if (role === Role.DRIVER && shipment.currentAssignedDriverId === actor.driverProfile?.id) {
        isAuthorized = true;
      }
    } else if (fromStatus === ShipmentStatus.DELIVERY_FAILED && toStatus === ShipmentStatus.RESCHEDULED) {
      // HUB_STAFF at destination hub
      if (role === Role.HUB_STAFF && actor.hubStaffProfile?.hubId === shipment.destinationHubId) {
        isAuthorized = true;
      }
    } else if (fromStatus === ShipmentStatus.DELIVERY_FAILED && toStatus === ShipmentStatus.RETURNED) {
      // ADMIN only (handled above)
      isAuthorized = false;
    } else if (fromStatus === ShipmentStatus.RESCHEDULED && toStatus === ShipmentStatus.OUT_FOR_DELIVERY) {
      // Assigned DRIVER
      if (role === Role.DRIVER && shipment.currentAssignedDriverId === actor.driverProfile?.id) {
        isAuthorized = true;
      }
    } else if (
      (fromStatus === ShipmentStatus.CREATED || fromStatus === ShipmentStatus.PICKUP_SCHEDULED) &&
      toStatus === ShipmentStatus.CANCELLED
    ) {
      // Owning CUSTOMER
      if (role === Role.CUSTOMER && shipment.customer?.userId === actor.id) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      await prisma.auditLog.create({
        data: {
          actorUserId: actor.id,
          actorRole: actor.role,
          action: 'STATUS_TRANSITION_REJECTED',
          entityType: 'Shipment',
          entityId: shipment.id,
          metadataJson: {
            fromStatus,
            toStatus,
            reason: 'FORBIDDEN_ROLE_OR_SCOPE',
          },
        },
      });

      throw new AppError(
        'You do not have permission to perform this status transition on this shipment.',
        403,
        'FORBIDDEN'
      );
    }
  }
}
