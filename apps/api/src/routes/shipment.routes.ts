import { Router, Request, Response, NextFunction } from 'express';
import { Role, ShipmentStatus, PaymentType, PaymentStatus } from '@prisma/client';
import {
  createShipmentSchema,
  updateShipmentSchema,
  statusTransitionSchema,
  assignDriverSchema,
  deliverShipmentSchema,
  deliveryFailureSchema,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_DELIVERY_ATTEMPTS,
} from '@eliteship/shared';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../middleware/envelope.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { PricingService } from '../services/pricing.service.js';
import { TrackingService } from '../services/tracking.service.js';
import { StateMachineService } from '../services/state-machine.service.js';
import { NotificationService } from '../services/notification.service.js';
import { AuditService } from '../services/audit.service.js';
import { PdfService } from '../services/pdf.service.js';

const router = Router();

/**
 * POST /api/shipments
 * Create a new shipment with atomic tracking number and frozen pricing snapshot.
 * Accessible to CUSTOMER and ADMIN.
 */
router.post(
  '/',
  authenticate,
  requireRole([Role.CUSTOMER, Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createShipmentSchema.parse(req.body);
      const user = req.user!;

      // 1. Resolve CustomerProfile
      let customerProfileId: string;
      if (user.role === Role.CUSTOMER) {
        if (!user.customerProfile) {
          throw new AppError('Customer profile not found.', 400, 'PROFILE_NOT_FOUND');
        }
        customerProfileId = user.customerProfile.id;
      } else {
        // ADMIN creating on behalf of customer
        const requestedCustomerId = (req.body.customerId as string) || '';
        if (requestedCustomerId) {
          const profile = await prisma.customerProfile.findUnique({
            where: { id: requestedCustomerId },
          });
          if (!profile) throw new AppError('Specified customer not found.', 404, 'NOT_FOUND');
          customerProfileId = profile.id;
        } else {
          // If admin does not specify an existing customer, find or create one for sender phone/email
          const dummyUser = await prisma.user.findFirst({
            where: { role: Role.CUSTOMER },
            include: { customerProfile: true },
          });
          if (!dummyUser?.customerProfile) {
            throw new AppError('No default customer profile available for admin booking.', 400);
          }
          customerProfileId = dummyUser.customerProfile.id;
        }
      }

      // 2. Resolve Hubs by City if not specified
      let originHubId = data.originHubId;
      let destinationHubId = data.destinationHubId;

      if (!originHubId) {
        const originHub = await prisma.hub.findFirst({
          where: { city: { equals: data.senderCity.trim(), mode: 'insensitive' }, isActive: true },
        });
        if (originHub) originHubId = originHub.id;
      }

      if (!destinationHubId) {
        const destinationHub = await prisma.hub.findFirst({
          where: { city: { equals: data.receiverCity.trim(), mode: 'insensitive' }, isActive: true },
        });
        if (destinationHub) destinationHubId = destinationHub.id;
      }

      // 3. Authoritative server-side pricing calculation
      const pricing = await PricingService.calculatePrice({
        serviceType: data.serviceType,
        originCity: data.senderCity,
        destinationCity: data.receiverCity,
        weightKg: data.weightKg,
        paymentType: data.paymentType,
        codAmount: data.codAmount,
        declaredValue: data.declaredValue,
      });

      // 4. Create Shipment in transaction with retry on tracking collision
      let createdShipment: any;
      let retryCount = 0;

      while (retryCount < 2) {
        try {
          createdShipment = await prisma.$transaction(async (tx) => {
            const trackingNumber = await TrackingService.generateTrackingNumber(tx);

            const shipment = await tx.shipment.create({
              data: {
                trackingNumber,
                customerId: customerProfileId,
                senderName: data.senderName,
                senderPhone: data.senderPhone,
                senderAddress: data.senderAddress,
                senderCity: data.senderCity,
                senderAddressExtra: data.senderAddressExtra || null,
                receiverName: data.receiverName,
                receiverPhone: data.receiverPhone,
                receiverAddress: data.receiverAddress,
                receiverCity: data.receiverCity,
                receiverAddressExtra: data.receiverAddressExtra || null,
                originHubId: originHubId || null,
                destinationHubId: destinationHubId || null,
                serviceType: data.serviceType,
                paymentType: data.paymentType,
                codAmount: data.paymentType === PaymentType.COD ? data.codAmount : null,
                status: ShipmentStatus.CREATED,
                packageType: data.packageType,
                weightKg: data.weightKg,
                lengthCm: data.lengthCm || null,
                widthCm: data.widthCm || null,
                heightCm: data.heightCm || null,
                description: data.description || null,
                declaredValue: data.declaredValue || null,
                isFragile: data.isFragile,
              },
            });

            // Freeze pricing snapshot
            await tx.pricingSnapshot.create({
              data: {
                shipmentId: shipment.id,
                pricingRuleId: pricing.ruleId || null,
                baseFee: pricing.baseFee,
                weightSurcharge: pricing.weightSurcharge,
                codFee: pricing.codFee,
                totalFee: pricing.totalFee,
                breakdownJson: pricing.breakdown as any,
              },
            });

            // Initialize Payment record
            // Prepaid shipments marked COLLECTED at creation; COD marked PENDING
            const paymentStatus = data.paymentType === PaymentType.PREPAID
              ? PaymentStatus.COLLECTED
              : PaymentStatus.PENDING;

            await tx.payment.create({
              data: {
                shipmentId: shipment.id,
                paymentType: data.paymentType,
                amountExpected: pricing.amountExpected,
                amountCollected: data.paymentType === PaymentType.PREPAID ? pricing.totalFee : null,
                status: paymentStatus,
                collectedById: data.paymentType === PaymentType.PREPAID ? user.id : null,
                collectedAt: data.paymentType === PaymentType.PREPAID ? new Date() : null,
              },
            });

            // Initial ShipmentStatusHistory record
            await tx.shipmentStatusHistory.create({
              data: {
                shipmentId: shipment.id,
                fromStatus: null,
                toStatus: ShipmentStatus.CREATED,
                actorUserId: user.id,
                actorRole: user.role,
                note: 'Shipment created and booking confirmed.',
              },
            });

            return shipment;
          });

          break; // Succeeded!
        } catch (err: any) {
          if (err?.code === 'P2002' && retryCount === 0) {
            retryCount++;
            continue; // Retry once with fresh sequence
          }
          throw err;
        }
      }

      // Log audit entry if admin created on customer's behalf
      if (user.role === Role.ADMIN) {
        await AuditService.log({
          actorUserId: user.id,
          actorRole: user.role,
          action: 'CREATE_SHIPMENT_ON_BEHALF',
          entityType: 'Shipment',
          entityId: createdShipment.id,
          metadataJson: { trackingNumber: createdShipment.trackingNumber },
        });
      }

      return sendSuccess(res, {
        shipment: createdShipment,
        trackingNumber: createdShipment.trackingNumber,
        pricing,
      }, 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/shipments
 * Role-scoped, paginated, searchable and filterable list.
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(req.query.pageSize as string, 10) || DEFAULT_PAGE_SIZE)
    );
    const skip = (page - 1) * pageSize;

    const status = req.query.status as ShipmentStatus | undefined;
    const serviceType = req.query.serviceType as any;
    const search = (req.query.search as string)?.trim();
    const hubId = req.query.hubId as string | undefined;
    const driverId = req.query.driverId as string | undefined;

    // Build role-scoped where clause
    const where: any = {};

    if (user.role === Role.CUSTOMER) {
      where.customerId = user.customerProfile?.id;
    } else if (user.role === Role.DRIVER) {
      where.currentAssignedDriverId = user.driverProfile?.id;
    } else if (user.role === Role.HUB_STAFF) {
      const staffHubId = user.hubStaffProfile?.hubId;
      where.OR = [
        { originHubId: staffHubId },
        { destinationHubId: staffHubId },
        { hubMovements: { some: { OR: [{ fromHubId: staffHubId }, { toHubId: staffHubId }] } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (serviceType) {
      where.serviceType = serviceType;
    }

    if (hubId && user.role === Role.ADMIN) {
      where.OR = [{ originHubId: hubId }, { destinationHubId: hubId }];
    }

    if (driverId && user.role === Role.ADMIN) {
      where.currentAssignedDriverId = driverId;
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { trackingNumber: { contains: search, mode: 'insensitive' } },
            { receiverName: { contains: search, mode: 'insensitive' } },
            { receiverPhone: { contains: search, mode: 'insensitive' } },
            { receiverCity: { contains: search, mode: 'insensitive' } },
            { senderName: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [total, shipments] = await Promise.all([
      prisma.shipment.count({ where }),
      prisma.shipment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          pricingSnapshot: true,
          payment: true,
          originHub: { select: { id: true, name: true, code: true, city: true } },
          destinationHub: { select: { id: true, name: true, code: true, city: true } },
          currentAssignedDriver: {
            select: {
              id: true,
              user: { select: { id: true, fullName: true, phone: true } },
            },
          },
        },
      }),
    ]);

    return sendSuccess(res, {
      shipments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/shipments/:id
 * Detailed shipment information, scoped to role.
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const id = req.params.id;

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, userId: true, user: { select: { fullName: true, email: true, phone: true } } } },
        pricingSnapshot: true,
        payment: true,
        deliveryProof: true,
        originHub: true,
        destinationHub: true,
        currentAssignedDriver: {
          include: {
            user: { select: { id: true, fullName: true, phone: true } },
            vehicle: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            hub: { select: { id: true, name: true, code: true } },
          },
        },
        hubMovements: {
          orderBy: { createdAt: 'asc' },
          include: {
            fromHub: { select: { id: true, name: true, code: true, city: true } },
            toHub: { select: { id: true, name: true, code: true, city: true } },
          },
        },
      },
    });

    if (!shipment) {
      throw new AppError('Shipment not found.', 404, 'NOT_FOUND');
    }

    // Role-scope check
    if (user.role === Role.CUSTOMER && shipment.customer.userId !== user.id) {
      throw new AppError('Shipment not found.', 404, 'NOT_FOUND');
    }

    if (user.role === Role.DRIVER && shipment.currentAssignedDriverId !== user.driverProfile?.id) {
      throw new AppError('Shipment not found.', 404, 'NOT_FOUND');
    }

    if (user.role === Role.HUB_STAFF) {
      const staffHubId = user.hubStaffProfile?.hubId;
      const isRelevant =
        shipment.originHubId === staffHubId ||
        shipment.destinationHubId === staffHubId ||
        shipment.hubMovements.some((m) => m.fromHubId === staffHubId || m.toHubId === staffHubId);

      if (!isRelevant) {
        throw new AppError('Shipment not found.', 404, 'NOT_FOUND');
      }
    }

    return sendSuccess(res, { shipment });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/shipments/:id
 * Edit sender/receiver/package info. Allowed ONLY while status = CREATED and caller is owner or admin.
 */
router.patch('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const id = req.params.id;
    const data = updateShipmentSchema.parse(req.body);

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!shipment) {
      throw new AppError('Shipment not found.', 404, 'NOT_FOUND');
    }

    if (user.role === Role.CUSTOMER && shipment.customer.userId !== user.id) {
      throw new AppError('You do not have permission to edit this shipment.', 403, 'FORBIDDEN');
    }

    if (user.role !== Role.ADMIN && user.role !== Role.CUSTOMER) {
      throw new AppError('You do not have permission to edit shipments.', 403, 'FORBIDDEN');
    }

    if (shipment.status !== ShipmentStatus.CREATED) {
      throw new AppError('Shipment details can only be edited while in CREATED status.', 400, 'EDIT_NOT_ALLOWED');
    }

    const updated = await prisma.shipment.update({
      where: { id },
      data: {
        ...(data.senderName ? { senderName: data.senderName } : {}),
        ...(data.senderPhone ? { senderPhone: data.senderPhone } : {}),
        ...(data.senderAddress ? { senderAddress: data.senderAddress } : {}),
        ...(data.senderCity ? { senderCity: data.senderCity } : {}),
        ...(data.senderAddressExtra !== undefined ? { senderAddressExtra: data.senderAddressExtra } : {}),
        ...(data.receiverName ? { receiverName: data.receiverName } : {}),
        ...(data.receiverPhone ? { receiverPhone: data.receiverPhone } : {}),
        ...(data.receiverAddress ? { receiverAddress: data.receiverAddress } : {}),
        ...(data.receiverCity ? { receiverCity: data.receiverCity } : {}),
        ...(data.receiverAddressExtra !== undefined ? { receiverAddressExtra: data.receiverAddressExtra } : {}),
        ...(data.packageType ? { packageType: data.packageType } : {}),
        ...(data.weightKg ? { weightKg: data.weightKg } : {}),
        ...(data.lengthCm !== undefined ? { lengthCm: data.lengthCm } : {}),
        ...(data.widthCm !== undefined ? { widthCm: data.widthCm } : {}),
        ...(data.heightCm !== undefined ? { heightCm: data.heightCm } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.declaredValue !== undefined ? { declaredValue: data.declaredValue } : {}),
        ...(data.isFragile !== undefined ? { isFragile: data.isFragile } : {}),
      },
    });

    return sendSuccess(res, { shipment: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/shipments/:id/cancel
 * Cancel shipment. Allowed only while status = CREATED or PICKUP_SCHEDULED.
 */
router.post('/:id/cancel', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const id = req.params.id;

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!shipment) throw new AppError('Shipment not found.', 404, 'NOT_FOUND');

    if (user.role === Role.CUSTOMER && shipment.customer.userId !== user.id) {
      throw new AppError('You do not have permission to cancel this shipment.', 403, 'FORBIDDEN');
    }

    if (
      shipment.status !== ShipmentStatus.CREATED &&
      shipment.status !== ShipmentStatus.PICKUP_SCHEDULED
    ) {
      throw new AppError(
        `Cannot cancel shipment once it has progressed beyond pickup scheduling (current status: ${shipment.status}).`,
        400,
        'CANNOT_CANCEL'
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.shipment.update({
        where: { id },
        data: {
          status: ShipmentStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      await tx.shipmentStatusHistory.create({
        data: {
          shipmentId: id,
          fromStatus: shipment.status,
          toStatus: ShipmentStatus.CANCELLED,
          actorUserId: user.id,
          actorRole: user.role,
          note: (req.body.reason as string) || 'Shipment cancelled by user request.',
        },
      });

      return s;
    });

    return sendSuccess(res, { shipment: updated, message: 'Shipment successfully cancelled.' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/shipments/:id/status
 * PATCH /api/shipments/:id/status
 * Transitions shipment status per state machine rules.
 */
const handleStatusTransition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const id = req.params.id;
    const body = statusTransitionSchema.parse(req.body);

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        customer: true,
        currentAssignedDriver: true,
      },
    });

    if (!shipment) throw new AppError('Shipment not found.', 404, 'NOT_FOUND');

    // Deliveries must go through POST /api/shipments/:id/deliver for payment reconciliation
    if (body.toStatus === ShipmentStatus.DELIVERED) {
      throw new AppError(
        'Delivery completion must be processed through POST /api/shipments/:id/deliver to ensure payment reconciliation and delivery proof.',
        400,
        'USE_DELIVER_ENDPOINT'
      );
    }

    // 1. Validate Transition per StateMachineService
    await StateMachineService.validateTransition({
      shipment,
      toStatus: body.toStatus,
      actor: user,
      targetHubId: body.hubId,
    });

    // 2. Perform transition in transaction
    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.shipment.update({
        where: { id },
        data: {
          status: body.toStatus,
        },
      });

      await tx.shipmentStatusHistory.create({
        data: {
          shipmentId: id,
          fromStatus: shipment.status,
          toStatus: body.toStatus,
          actorUserId: user.id,
          actorRole: user.role,
          hubId: body.hubId || user.hubStaffProfile?.hubId || null,
          note: body.note || null,
        },
      });

      return s;
    });

    // 3. Dispatch notifications for significant status milestones
    const milestoneStatuses: ShipmentStatus[] = [
      ShipmentStatus.PICKED_UP,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.OUT_FOR_DELIVERY,
      ShipmentStatus.DELIVERED,
      ShipmentStatus.DELIVERY_FAILED,
    ];
    if (milestoneStatuses.includes(body.toStatus as ShipmentStatus)) {
      await NotificationService.sendNotification({
        userId: shipment.customer.userId,
        title: `Shipment Update: ${shipment.trackingNumber}`,
        body: `Your shipment status is now: ${body.toStatus.replace(/_/g, ' ')}.`,
        relatedShipmentId: shipment.id,
      });
    }

    return sendSuccess(res, { shipment: updated });
  } catch (error) {
    next(error);
  }
};

router.post('/:id/status', authenticate, handleStatusTransition);
router.patch('/:id/status', authenticate, handleStatusTransition);

/**
 * POST /api/shipments/:id/assign-driver
 * Assigns a driver for delivery per Section 9.2 rules.
 */
router.post(
  '/:id/assign-driver',
  authenticate,
  requireRole([Role.ADMIN, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const id = req.params.id;
      const { driverId } = assignDriverSchema.parse(req.body);

      const shipment = await prisma.shipment.findUnique({
        where: { id },
        include: { destinationHub: true },
      });

      if (!shipment) throw new AppError('Shipment not found.', 404, 'NOT_FOUND');

      // Validation 1: Hub staff scope
      if (user.role === Role.HUB_STAFF && shipment.destinationHubId !== user.hubStaffProfile?.hubId) {
        throw new AppError('You can only assign drivers to shipments at your destination hub.', 403, 'FORBIDDEN');
      }

      // Validation 1b: Double assignment check
      if (shipment.currentAssignedDriverId) {
        throw new AppError('This shipment is already assigned to a driver.', 409, 'ALREADY_ASSIGNED');
      }

      // Validation 2: Driver exists, active, has role DRIVER
      const driver = await prisma.driverProfile.findUnique({
        where: { id: driverId },
        include: { user: true },
      });

      if (!driver || !driver.user.isActive || driver.user.role !== Role.DRIVER) {
        throw new AppError('Selected driver is invalid or inactive.', 400, 'INVALID_DRIVER');
      }

      // Validation 2b: Driver must belong to the hub
      if (user.role === Role.HUB_STAFF && driver.homeHubId !== user.hubStaffProfile?.hubId) {
        throw new AppError('Selected driver does not belong to your hub.', 400, 'DRIVER_HUB_MISMATCH');
      }

      // Validation 3: Shipment status must be AT_DESTINATION_HUB, DELIVERY_FAILED, or RESCHEDULED
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

      // Validation 4: Not terminal
      const terminalStatuses: ShipmentStatus[] = [
        ShipmentStatus.CANCELLED,
        ShipmentStatus.DELIVERED,
        ShipmentStatus.RETURNED,
      ];
      if (terminalStatuses.includes(shipment.status)) {
        throw new AppError('Cannot assign driver to a closed or terminal shipment.', 400, 'TERMINAL_SHIPMENT');
      }

      // 5. Execute assignment in transaction
      const updated = await prisma.$transaction(async (tx) => {
        // Deactivate existing assignments
        await tx.driverAssignment.updateMany({
          where: { shipmentId: id, isActive: true },
          data: { isActive: false, unassignedAt: new Date() },
        });

        // Create new assignment
        await tx.driverAssignment.create({
          data: {
            shipmentId: id,
            driverId: driver.id,
            assignedById: user.id,
            isActive: true,
          },
        });

        // Update shipment
        const s = await tx.shipment.update({
          where: { id },
          data: {
            currentAssignedDriverId: driver.id,
            status: ShipmentStatus.ASSIGNED_TO_DRIVER,
          },
        });

        // Status history
        await tx.shipmentStatusHistory.create({
          data: {
            shipmentId: id,
            fromStatus: shipment.status,
            toStatus: ShipmentStatus.ASSIGNED_TO_DRIVER,
            actorUserId: user.id,
            actorRole: user.role,
            note: `Assigned to delivery driver ${driver.user.fullName}.`,
          },
        });

        return s;
      });

      // Notify the driver
      await NotificationService.sendNotification({
        userId: driver.userId,
        title: 'New Delivery Assignment',
        body: `You have been assigned shipment ${shipment.trackingNumber}.`,
        relatedShipmentId: shipment.id,
      });

      return sendSuccess(res, { shipment: updated });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/shipments/:id/deliver
 * Terminal delivery state with COD collection and delivery proof.
 */
router.post(
  '/:id/deliver',
  authenticate,
  requireRole([Role.ADMIN, Role.DRIVER]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const id = req.params.id;
      const data = deliverShipmentSchema.parse(req.body);

      const shipment = await prisma.shipment.findUnique({
        where: { id },
        include: {
          customer: true,
          payment: true,
          currentAssignedDriver: true,
        },
      });

      if (!shipment) throw new AppError('Shipment not found.', 404, 'NOT_FOUND');

      // Driver scoping
      if (user.role === Role.DRIVER && shipment.currentAssignedDriverId !== user.driverProfile?.id) {
        throw new AppError('You are not the assigned driver for this shipment.', 403, 'FORBIDDEN');
      }

      if (shipment.status === ShipmentStatus.DELIVERED) {
        throw new AppError('This shipment has already been marked as DELIVERED.', 409, 'ALREADY_DELIVERED');
      }

      if (shipment.status !== ShipmentStatus.OUT_FOR_DELIVERY) {
        throw new AppError(
          `Shipment must be OUT_FOR_DELIVERY to mark DELIVERED (current status: ${shipment.status}).`,
          400,
          'INVALID_STATUS'
        );
      }

      // COD Validation
      if (shipment.paymentType === PaymentType.COD) {
        if (data.amountCollected === undefined || data.amountCollected === null) {
          throw new AppError('Amount collected is required for Cash on Delivery shipments.', 422, 'COD_AMOUNT_REQUIRED');
        }
        if (data.amountCollected < 0) {
          throw new AppError('Amount collected cannot be negative.', 422, 'INVALID_AMOUNT');
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        // Re-check status inside transaction to prevent race conditions
        const fresh = await tx.shipment.findUnique({
          where: { id },
          include: { payment: true },
        });

        if (!fresh || fresh.status === ShipmentStatus.DELIVERED) {
          throw new AppError('This shipment has already been delivered.', 409, 'ALREADY_DELIVERED');
        }

        if (fresh.paymentType === PaymentType.COD && fresh.payment?.status === PaymentStatus.COLLECTED && fresh.payment?.collectedAt) {
          throw new AppError('Payment has already been reconciled for this shipment.', 409, 'PAYMENT_ALREADY_COLLECTED');
        }

        // 1. Update Shipment status
        const s = await tx.shipment.update({
          where: { id },
          data: { status: ShipmentStatus.DELIVERED },
        });

        // 2. Create DeliveryProof
        await tx.deliveryProof.upsert({
          where: { shipmentId: id },
          update: {
            recipientName: data.recipientName || shipment.receiverName,
            note: data.note || null,
            proofImageUrl: data.proofImageUrl || null,
          },
          create: {
            shipmentId: id,
            recipientName: data.recipientName || shipment.receiverName,
            note: data.note || null,
            proofImageUrl: data.proofImageUrl || null,
          },
        });

        // 3. Reconcile Payment if COD
        if (shipment.paymentType === PaymentType.COD && shipment.payment) {
          const expected = shipment.payment.amountExpected;
          const collected = data.amountCollected!;
          const hasDiscrepancy = collected !== expected;

          if (hasDiscrepancy && !data.discrepancyNote && !data.note) {
            throw new AppError(
              `Amount collected (${collected}) differs from expected (${expected}). A discrepancy note is required.`,
              422,
              'DISCREPANCY_NOTE_REQUIRED'
            );
          }

          await tx.payment.update({
            where: { shipmentId: id },
            data: {
              amountCollected: collected,
              status: PaymentStatus.COLLECTED,
              hasDiscrepancy,
              discrepancyNote: hasDiscrepancy ? (data.discrepancyNote || data.note || 'Discrepancy reported') : null,
              collectedById: user.id,
              collectedAt: new Date(),
            },
          });
        }

        // 4. Create ShipmentStatusHistory
        await tx.shipmentStatusHistory.create({
          data: {
            shipmentId: id,
            fromStatus: shipment.status,
            toStatus: ShipmentStatus.DELIVERED,
            actorUserId: user.id,
            actorRole: user.role,
            note: data.note || `Delivered to ${data.recipientName || shipment.receiverName}.`,
          },
        });

        return s;
      });

      // Notify customer
      await NotificationService.sendNotification({
        userId: shipment.customer.userId,
        title: 'Shipment Delivered!',
        body: `Your shipment ${shipment.trackingNumber} has been successfully delivered.`,
        relatedShipmentId: shipment.id,
      });

      return sendSuccess(res, { shipment: updated, message: 'Shipment marked as DELIVERED.' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/driver/shipments/:id/fail
 * Record delivery attempt failure with reason per Section 9.4
 */
router.post(
  '/driver/shipments/:id/fail',
  authenticate,
  requireRole([Role.ADMIN, Role.DRIVER]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const id = req.params.id;
      const data = deliveryFailureSchema.parse(req.body);

      const shipment = await prisma.shipment.findUnique({
        where: { id },
        include: { customer: true },
      });

      if (!shipment) throw new AppError('Shipment not found.', 404, 'NOT_FOUND');

      if (user.role === Role.DRIVER && shipment.currentAssignedDriverId !== user.driverProfile?.id) {
        throw new AppError('You are not the assigned driver for this shipment.', 403, 'FORBIDDEN');
      }

      if (shipment.status !== ShipmentStatus.OUT_FOR_DELIVERY) {
        throw new AppError('Shipment must be OUT_FOR_DELIVERY to record a delivery failure.', 400, 'INVALID_STATUS');
      }

      const updated = await prisma.$transaction(async (tx) => {
        const attempts = shipment.deliveryAttempts + 1;

        const s = await tx.shipment.update({
          where: { id },
          data: {
            status: ShipmentStatus.DELIVERY_FAILED,
            deliveryAttempts: attempts,
          },
        });

        await tx.shipmentStatusHistory.create({
          data: {
            shipmentId: id,
            fromStatus: shipment.status,
            toStatus: ShipmentStatus.DELIVERY_FAILED,
            actorUserId: user.id,
            actorRole: user.role,
            note: `Delivery attempt #${attempts} failed. Reason: ${data.reason}. ${data.note || ''}`.trim(),
          },
        });

        return s;
      });

      // Customer notification
      await NotificationService.sendNotification({
        userId: shipment.customer.userId,
        title: 'Delivery Attempt Failed',
        body: `Delivery attempt for ${shipment.trackingNumber} failed (${data.reason}). A re-attempt will be scheduled.`,
        relatedShipmentId: shipment.id,
      });

      // If maximum attempts reached, notify admins
      if (updated.deliveryAttempts >= MAX_DELIVERY_ATTEMPTS) {
        await NotificationService.notifyAdmins({
          title: `Max Delivery Attempts Exceeded: ${shipment.trackingNumber}`,
          body: `Shipment ${shipment.trackingNumber} has reached ${updated.deliveryAttempts} failed attempts. Review for return to sender.`,
          relatedShipmentId: shipment.id,
        });
      }

      return sendSuccess(res, {
        shipment: updated,
        message: 'Delivery failure recorded.',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/shipments/:id/receipt
 * Streams PDF receipt for shipment. Accessible to customer, staff, admin.
 */
router.get('/:id/receipt', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const id = req.params.id;

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        customer: true,
        pricingSnapshot: true,
        payment: true,
      },
    });

    if (!shipment) throw new AppError('Shipment not found.', 404, 'NOT_FOUND');

    if (user.role === Role.CUSTOMER && shipment.customer.userId !== user.id) {
      throw new AppError('Shipment not found.', 404, 'NOT_FOUND');
    }

    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'singleton' },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="EliteShip-Receipt-${shipment.trackingNumber}.pdf"`
    );

    const pdfDoc = PdfService.generateShipmentReceipt(shipment, settings);
    pdfDoc.pipe(res);
  } catch (error) {
    next(error);
  }
});

export default router;
