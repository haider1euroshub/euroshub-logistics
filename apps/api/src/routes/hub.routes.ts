import { Router, Request, Response, NextFunction } from 'express';
import { Role, ShipmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../middleware/envelope.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { NotificationService } from '../services/notification.service.js';

const router = Router();

/**
 * GET /api/hubs/public
 * Returns active hubs and distinct active cities for public use (homepage, rate calculator).
 */
router.get('/public', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hubs = await prisma.hub.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        address: true,
        phone: true,
        latitude: true,
        longitude: true,
      },
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
    });

    const cities = Array.from(new Set(hubs.map((h) => h.city))).sort();

    return sendSuccess(res, { hubs, cities });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/hubs/available-destinations
 * Returns active hubs that the authenticated staff member or admin can dispatch towards.
 * For HUB_STAFF, excludes their own assigned hub.
 */
router.get(
  '/available-destinations',
  authenticate,
  requireRole([Role.ADMIN, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const staffHubId = user.role === Role.HUB_STAFF ? user.hubStaffProfile?.hubId : undefined;

      const where: any = { isActive: true };
      if (staffHubId) {
        where.id = { not: staffHubId };
      }

      const hubs = await prisma.hub.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          city: true,
        },
        orderBy: [{ city: 'asc' }, { name: 'asc' }],
      });

      return sendSuccess(res, { hubs });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/hubs/:id/dispatchable-shipments
 * Returns parcels currently present at this hub that are ready for onward dispatch.
 * Accessible to HUB_STAFF (at this hub) and ADMIN.
 */
router.get(
  '/:id/dispatchable-shipments',
  authenticate,
  requireRole([Role.ADMIN, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const hubId = req.params.id;

      if (user.role === Role.HUB_STAFF && user.hubStaffProfile?.hubId !== hubId) {
        throw new AppError('You can only view shipments for your assigned hub.', 403, 'FORBIDDEN');
      }

      const shipments = await prisma.shipment.findMany({
        where: {
          status: ShipmentStatus.AT_ORIGIN_HUB,
          OR: [
            { originHubId: hubId },
            { hubMovements: { some: { toHubId: hubId, arrivedAt: { not: null } } } },
          ],
          hubMovements: {
            none: { arrivedAt: null },
          },
        },
        select: {
          id: true,
          trackingNumber: true,
          senderName: true,
          senderCity: true,
          receiverName: true,
          receiverCity: true,
          destinationHubId: true,
          destinationHub: {
            select: { id: true, name: true, city: true, code: true },
          },
          serviceType: true,
          paymentType: true,
          status: true,
          weightKg: true,
          packageType: true,
          isFragile: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return sendSuccess(res, { shipments });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/hubs/:id/receive
 * Mark a shipment as arrived/checked in at the hub.
 * Accessible to HUB_STAFF (at this hub) and ADMIN.
 */
router.post(
  '/:id/receive',
  authenticate,
  requireRole([Role.ADMIN, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const hubId = req.params.id;
      const { shipmentId, trackingNumber, notes } = req.body;

      if (user.role === Role.HUB_STAFF && user.hubStaffProfile?.hubId !== hubId) {
        throw new AppError('You can only check in packages at your assigned hub.', 403, 'FORBIDDEN');
      }

      // Find shipment by ID or trackingNumber
      const shipment = await prisma.shipment.findFirst({
        where: {
          OR: [
            ...(shipmentId ? [{ id: shipmentId }] : []),
            ...(trackingNumber ? [{ trackingNumber: trackingNumber.trim().toUpperCase() }] : []),
          ],
        },
        include: {
          customer: true,
          hubMovements: {
            where: { arrivedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!shipment) throw new AppError('Shipment not found.', 404, 'NOT_FOUND');

      const currentHub = await prisma.hub.findUnique({ where: { id: hubId } });
      if (!currentHub) throw new AppError('Hub not found.', 404, 'NOT_FOUND');

      // Determine target status: destination hub gets AT_DESTINATION_HUB, intermediate gets AT_ORIGIN_HUB
      const isDestination =
        shipment.destinationHubId === hubId ||
        Boolean(
          shipment.receiverCity &&
          currentHub.city &&
          shipment.receiverCity.trim().toLowerCase() === currentHub.city.trim().toLowerCase()
        );

      let toStatus: ShipmentStatus;
      if (shipment.status === ShipmentStatus.IN_TRANSIT) {
        toStatus = isDestination ? ShipmentStatus.AT_DESTINATION_HUB : ShipmentStatus.AT_ORIGIN_HUB;
      } else if (isDestination) {
        toStatus = ShipmentStatus.AT_DESTINATION_HUB;
      } else {
        toStatus = ShipmentStatus.AT_ORIGIN_HUB;
      }

      const updated = await prisma.$transaction(async (tx) => {
        // Close open movement if any
        if (shipment.hubMovements.length > 0) {
          const openMovement = shipment.hubMovements[0];
          await tx.hubMovement.update({
            where: { id: openMovement.id },
            data: {
              arrivedAt: new Date(),
              notes: notes || openMovement.notes,
            },
          });
        }

        const s = await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            status: toStatus,
            ...(isDestination && !shipment.destinationHubId ? { destinationHubId: hubId } : {}),
          },
        });

        await tx.shipmentStatusHistory.create({
          data: {
            shipmentId: shipment.id,
            fromStatus: shipment.status,
            toStatus,
            actorUserId: user.id,
            actorRole: user.role,
            hubId,
            note: notes || `Checked in at hub (${currentHub.name}). Status: ${toStatus}`,
          },
        });

        return s;
      });

      return sendSuccess(res, { shipment: updated, message: `Shipment checked in at hub (${toStatus}).` });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/hubs/:id/dispatch
 * Mark a shipment as dispatched from this hub toward another hub.
 * Accessible to HUB_STAFF (at this hub) and ADMIN.
 */
router.post(
  '/:id/dispatch',
  authenticate,
  requireRole([Role.ADMIN, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const fromHubId = req.params.id;
      const { shipmentId, trackingNumber, toHubId, notes } = req.body;

      if (!toHubId) throw new AppError('Destination hub ID (toHubId) is required.', 422);

      if (user.role === Role.HUB_STAFF && user.hubStaffProfile?.hubId !== fromHubId) {
        throw new AppError('You can only dispatch packages from your assigned hub.', 403, 'FORBIDDEN');
      }

      if (toHubId === fromHubId) {
        throw new AppError('Destination hub cannot be the same as the origin hub.', 422);
      }

      // Verify destination hub exists and is active
      const destinationHub = await prisma.hub.findUnique({
        where: { id: toHubId },
      });
      if (!destinationHub || !destinationHub.isActive) {
        throw new AppError('Destination hub not found or is currently inactive.', 400);
      }

      const shipment = await prisma.shipment.findFirst({
        where: {
          OR: [
            ...(shipmentId ? [{ id: shipmentId }] : []),
            ...(trackingNumber ? [{ trackingNumber: trackingNumber.trim().toUpperCase() }] : []),
          ],
        },
        include: {
          customer: true,
          hubMovements: {
            where: { arrivedAt: null },
          },
        },
      });

      if (!shipment) throw new AppError('Shipment not found.', 404, 'NOT_FOUND');

      // Verify lifecycle status permits dispatch
      if (shipment.status !== ShipmentStatus.AT_ORIGIN_HUB) {
        throw new AppError(
          `Shipment cannot be dispatched from current status: ${shipment.status}. Shipment must be checked in at this hub before dispatch.`,
          400,
          'INVALID_STATUS_FOR_DISPATCH'
        );
      }

      // Guard against duplicate open movement rows
      if (shipment.hubMovements.length > 0) {
        throw new AppError(
          'Shipment has an active transit movement that has not been checked in at its destination yet.',
          409,
          'OPEN_MOVEMENT_EXISTS'
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        // Create new HubMovement
        await tx.hubMovement.create({
          data: {
            shipmentId: shipment.id,
            fromHubId,
            toHubId,
            dispatchedAt: new Date(),
            actorUserId: user.id,
            notes: notes || null,
          },
        });

        const s = await tx.shipment.update({
          where: { id: shipment.id },
          data: { status: ShipmentStatus.IN_TRANSIT },
        });

        await tx.shipmentStatusHistory.create({
          data: {
            shipmentId: shipment.id,
            fromStatus: shipment.status,
            toStatus: ShipmentStatus.IN_TRANSIT,
            actorUserId: user.id,
            actorRole: user.role,
            hubId: fromHubId,
            note: notes || `Dispatched from hub towards ${destinationHub.name} (${destinationHub.city}).`,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            actorRole: user.role,
            action: 'DISPATCH_SHIPMENT',
            entityType: 'Shipment',
            entityId: shipment.id,
            metadataJson: {
              fromHubId,
              toHubId,
              trackingNumber: shipment.trackingNumber,
            },
          },
        });

        return s;
      });

      await NotificationService.sendNotification({
        userId: shipment.customer.userId,
        title: 'Shipment in Transit',
        body: `Your parcel ${shipment.trackingNumber} is in transit towards ${destinationHub.name} (${destinationHub.city}).`,
        relatedShipmentId: shipment.id,
      });

      return sendSuccess(res, {
        shipment: updated,
        message: `Shipment ${shipment.trackingNumber} dispatched into transit toward ${destinationHub.name}.`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/hubs/:id/dashboard
 * Aggregated metrics for hub staff
 */
router.get(
  '/:id/dashboard',
  authenticate,
  requireRole([Role.ADMIN, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const hubId = req.params.id;

      if (user.role === Role.HUB_STAFF && user.hubStaffProfile?.hubId !== hubId) {
        throw new AppError('You can only view dashboard metrics for your assigned hub.', 403, 'FORBIDDEN');
      }

      const [
        atHubCount,
        incomingInTransitCount,
        readyForDriverCount,
        outForDeliveryCount,
        activeDriversCount,
      ] = await Promise.all([
        prisma.shipment.count({
          where: {
            OR: [
              { originHubId: hubId, status: ShipmentStatus.AT_ORIGIN_HUB },
              { destinationHubId: hubId, status: ShipmentStatus.AT_DESTINATION_HUB },
            ],
          },
        }),
        prisma.hubMovement.count({
          where: { toHubId: hubId, arrivedAt: null },
        }),
        prisma.shipment.count({
          where: { destinationHubId: hubId, status: ShipmentStatus.AT_DESTINATION_HUB },
        }),
        prisma.shipment.count({
          where: { destinationHubId: hubId, status: ShipmentStatus.OUT_FOR_DELIVERY },
        }),
        prisma.driverProfile.count({
          where: { homeHubId: hubId, user: { isActive: true } },
        }),
      ]);

      return sendSuccess(res, {
        metrics: {
          atHubCount,
          incomingInTransitCount,
          readyForDriverCount,
          outForDeliveryCount,
          activeDriversCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/hubs/:id/drivers
 * Returns active drivers assigned to this hub for delivery assignment.
 * Accessible to HUB_STAFF (at this hub) and ADMIN.
 */
router.get(
  '/:id/drivers',
  authenticate,
  requireRole([Role.ADMIN, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const hubId = req.params.id;

      if (user.role === Role.HUB_STAFF && user.hubStaffProfile?.hubId !== hubId) {
        throw new AppError('You can only view drivers for your assigned hub.', 403, 'FORBIDDEN');
      }

      const drivers = await prisma.driverProfile.findMany({
        where: {
          homeHubId: hubId,
          user: { isActive: true, role: Role.DRIVER },
        },
        include: {
          user: {
            select: { id: true, fullName: true, phone: true, email: true, isActive: true },
          },
          vehicle: {
            select: { id: true, registrationNo: true, type: true, makeModel: true, status: true },
          },
          assignedShipments: {
            where: {
              status: {
                in: [ShipmentStatus.ASSIGNED_TO_DRIVER, ShipmentStatus.OUT_FOR_DELIVERY],
              },
            },
            select: { id: true },
          },
        },
        orderBy: { user: { fullName: 'asc' } },
      });

      const sanitizedDrivers = drivers.map((d) => ({
        id: d.id,
        userId: d.userId,
        fullName: d.user.fullName,
        phone: d.user.phone,
        email: d.user.email,
        vehicleRegistration: d.vehicle?.registrationNo || null,
        vehicleModel: d.vehicle?.makeModel || null,
        vehicleStatus: d.vehicle?.status || 'AVAILABLE',
        activeDeliveriesCount: d.assignedShipments.length,
        isAvailable: d.assignedShipments.length < 20,
      }));

      return sendSuccess(res, { drivers: sanitizedDrivers });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/hubs/:id/delivery-shipments
 * Returns shipments physically present at this destination hub awaiting driver assignment.
 * Accessible to HUB_STAFF (at this hub) and ADMIN.
 */
router.get(
  '/:id/delivery-shipments',
  authenticate,
  requireRole([Role.ADMIN, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const hubId = req.params.id;

      if (user.role === Role.HUB_STAFF && user.hubStaffProfile?.hubId !== hubId) {
        throw new AppError('You can only view delivery shipments for your assigned hub.', 403, 'FORBIDDEN');
      }

      const shipments = await prisma.shipment.findMany({
        where: {
          status: {
            in: [
              ShipmentStatus.AT_DESTINATION_HUB,
              ShipmentStatus.DELIVERY_FAILED,
              ShipmentStatus.RESCHEDULED,
            ],
          },
          destinationHubId: hubId,
          currentAssignedDriverId: null,
          hubMovements: {
            none: { arrivedAt: null },
          },
        },
        select: {
          id: true,
          trackingNumber: true,
          senderName: true,
          senderCity: true,
          receiverName: true,
          receiverPhone: true,
          receiverAddress: true,
          receiverAddressExtra: true,
          receiverCity: true,
          serviceType: true,
          paymentType: true,
          codAmount: true,
          weightKg: true,
          packageType: true,
          isFragile: true,
          status: true,
          deliveryAttempts: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return sendSuccess(res, { shipments });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/hubs/:id/active-deliveries
 * Returns shipments currently assigned to or out with drivers for this hub.
 * Accessible to HUB_STAFF (at this hub) and ADMIN.
 */
router.get(
  '/:id/active-deliveries',
  authenticate,
  requireRole([Role.ADMIN, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const hubId = req.params.id;

      if (user.role === Role.HUB_STAFF && user.hubStaffProfile?.hubId !== hubId) {
        throw new AppError('You can only view active deliveries for your assigned hub.', 403, 'FORBIDDEN');
      }

      const shipments = await prisma.shipment.findMany({
        where: {
          destinationHubId: hubId,
          status: {
            in: [ShipmentStatus.ASSIGNED_TO_DRIVER, ShipmentStatus.OUT_FOR_DELIVERY],
          },
        },
        include: {
          currentAssignedDriver: {
            include: {
              user: { select: { fullName: true, phone: true } },
              vehicle: { select: { registrationNo: true } },
            },
          },
          assignments: {
            where: { isActive: true },
            orderBy: { assignedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const formatted = shipments.map((s) => ({
        id: s.id,
        trackingNumber: s.trackingNumber,
        receiverName: s.receiverName,
        receiverPhone: s.receiverPhone,
        receiverAddress: s.receiverAddress,
        receiverCity: s.receiverCity,
        serviceType: s.serviceType,
        paymentType: s.paymentType,
        codAmount: s.codAmount,
        weightKg: s.weightKg,
        status: s.status,
        driverName: s.currentAssignedDriver?.user.fullName || 'Unassigned',
        driverPhone: s.currentAssignedDriver?.user.phone || null,
        vehicleRegistration: s.currentAssignedDriver?.vehicle?.registrationNo || null,
        assignedAt: s.assignments[0]?.assignedAt || s.updatedAt,
      }));

      return sendSuccess(res, { shipments: formatted });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/hubs/:id/inbound-shipments
 * Returns parcels currently in transit towards this hub.
 * Accessible to HUB_STAFF (at this hub) and ADMIN.
 */
router.get(
  '/:id/inbound-shipments',
  authenticate,
  requireRole([Role.ADMIN, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const hubId = req.params.id;

      if (user.role === Role.HUB_STAFF && user.hubStaffProfile?.hubId !== hubId) {
        throw new AppError('You can only view inbound shipments for your assigned hub.', 403, 'FORBIDDEN');
      }

      const movements = await prisma.hubMovement.findMany({
        where: {
          toHubId: hubId,
          arrivedAt: null,
          shipment: { status: ShipmentStatus.IN_TRANSIT },
        },
        include: {
          fromHub: { select: { id: true, name: true, city: true, code: true } },
          shipment: {
            select: {
              id: true,
              trackingNumber: true,
              senderCity: true,
              receiverCity: true,
              receiverName: true,
              serviceType: true,
              weightKg: true,
              status: true,
            },
          },
        },
        orderBy: { dispatchedAt: 'desc' },
      });

      const shipments = movements.map((m) => ({
        id: m.shipment.id,
        trackingNumber: m.shipment.trackingNumber,
        fromHubName: m.fromHub?.name || 'Origin Hub',
        fromHubCity: m.fromHub?.city || m.shipment.senderCity,
        destinationCity: m.shipment.receiverCity,
        recipientName: m.shipment.receiverName,
        weightKg: m.shipment.weightKg,
        serviceType: m.shipment.serviceType,
        dispatchedAt: m.dispatchedAt,
        notes: m.notes,
      }));

      return sendSuccess(res, { shipments });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/hubs/:id/assign-driver
 * Assigns an eligible shipment to an active driver at this hub.
 * Enforces strict role, hub boundary, and single-assignment rules.
 * Accessible to HUB_STAFF (at this hub) and ADMIN.
 */
router.post(
  '/:id/assign-driver',
  authenticate,
  requireRole([Role.ADMIN, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const hubId = req.params.id;
      const { shipmentId, trackingNumber, driverId, notes } = req.body;

      if (user.role === Role.HUB_STAFF && user.hubStaffProfile?.hubId !== hubId) {
        throw new AppError('You can only assign drivers at your assigned hub.', 403, 'FORBIDDEN');
      }

      if (!driverId) {
        throw new AppError('Driver ID is required.', 400, 'VALIDATION_ERROR');
      }

      // 1. Locate shipment
      const shipment = await prisma.shipment.findFirst({
        where: {
          OR: [
            ...(shipmentId ? [{ id: shipmentId }] : []),
            ...(trackingNumber ? [{ trackingNumber: trackingNumber.trim().toUpperCase() }] : []),
          ],
        },
        include: {
          customer: true,
          currentAssignedDriver: true,
          assignments: { where: { isActive: true } },
        },
      });

      if (!shipment) {
        throw new AppError('Shipment not found.', 404, 'NOT_FOUND');
      }

      // 2. Hub boundary check: shipment must be at this destination hub
      if (shipment.destinationHubId !== hubId) {
        throw new AppError(
          'You can only assign drivers to shipments located at your hub.',
          403,
          'FORBIDDEN'
        );
      }

      // 3. Double assignment check: prevent multiple active assignments
      if (shipment.currentAssignedDriverId || shipment.assignments.length > 0) {
        throw new AppError(
          'This shipment is already assigned to a driver.',
          409,
          'ALREADY_ASSIGNED'
        );
      }

      // 4. Status eligibility check
      const validAssignmentStatuses: ShipmentStatus[] = [
        ShipmentStatus.AT_DESTINATION_HUB,
        ShipmentStatus.DELIVERY_FAILED,
        ShipmentStatus.RESCHEDULED,
      ];
      if (!validAssignmentStatuses.includes(shipment.status)) {
        throw new AppError(
          `Cannot assign delivery driver while shipment status is ${shipment.status}. Must be AT_DESTINATION_HUB, DELIVERY_FAILED, or RESCHEDULED.`,
          400,
          'INVALID_STATUS_FOR_ASSIGNMENT'
        );
      }

      // 5. Driver validation
      const driver = await prisma.driverProfile.findUnique({
        where: { id: driverId },
        include: { user: true, homeHub: true },
      });

      if (!driver || !driver.user.isActive || driver.user.role !== Role.DRIVER) {
        throw new AppError('Selected driver is invalid or inactive.', 400, 'INVALID_DRIVER');
      }

      // Strict same-hub driver check: driver must belong to this hub!
      if (driver.homeHubId !== hubId) {
        throw new AppError(
          'Selected driver does not belong to this hub.',
          400,
          'DRIVER_HUB_MISMATCH'
        );
      }

      // 6. Transactional assignment
      const updated = await prisma.$transaction(async (tx) => {
        // Deactivate any previous inactive assignments
        await tx.driverAssignment.updateMany({
          where: { shipmentId: shipment.id, isActive: true },
          data: { isActive: false, unassignedAt: new Date() },
        });

        // Create new active DriverAssignment
        await tx.driverAssignment.create({
          data: {
            shipmentId: shipment.id,
            driverId: driver.id,
            assignedById: user.id,
            isActive: true,
          },
        });

        // Update shipment
        const s = await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            currentAssignedDriverId: driver.id,
            status: ShipmentStatus.ASSIGNED_TO_DRIVER,
          },
        });

        // Add to Status History
        await tx.shipmentStatusHistory.create({
          data: {
            shipmentId: shipment.id,
            fromStatus: shipment.status,
            toStatus: ShipmentStatus.ASSIGNED_TO_DRIVER,
            actorUserId: user.id,
            actorRole: user.role,
            hubId,
            note: notes || `Assigned to delivery driver ${driver.user.fullName}.`,
          },
        });

        // Log audit
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            actorRole: user.role,
            action: 'ASSIGN_DRIVER',
            entityType: 'Shipment',
            entityId: shipment.id,
            metadataJson: {
              driverId: driver.id,
              driverName: driver.user.fullName,
              hubId,
              trackingNumber: shipment.trackingNumber,
            },
          },
        });

        return s;
      });

      // 7. Notifications
      await NotificationService.sendNotification({
        userId: driver.userId,
        title: 'New Delivery Assignment',
        body: `You have been assigned shipment ${shipment.trackingNumber}.`,
        relatedShipmentId: shipment.id,
      });

      await NotificationService.sendNotification({
        userId: shipment.customer.userId,
        title: 'Delivery Assigned',
        body: `Your shipment ${shipment.trackingNumber} has been assigned to driver ${driver.user.fullName} for delivery.`,
        relatedShipmentId: shipment.id,
      });

      return sendSuccess(res, {
        shipment: updated,
        message: `Shipment ${shipment.trackingNumber} assigned to ${driver.user.fullName} successfully.`,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
