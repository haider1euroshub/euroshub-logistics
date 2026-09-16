import { Router, Request, Response, NextFunction } from 'express';
import { Role, ShipmentStatus } from '@eliteship/shared';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../middleware/envelope.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { NotificationService } from '../services/notification.service.js';

const router = Router();

/**
 * GET /api/driver/dashboard
 * Scoped to authenticated DRIVER's profile.
 * Delivers counts, COD to collect, and today's active delivery roster.
 */
router.get(
  '/dashboard',
  authenticate,
  requireRole([Role.DRIVER]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const driver = req.user!.driverProfile;
      if (!driver) throw new AppError('Driver profile not found.', 400);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        assignedShipments,
        outForDeliveryShipments,
        deliveredTodayShipments,
        failedShipments,
      ] = await Promise.all([
        prisma.shipment.findMany({
          where: {
            currentAssignedDriverId: driver.id,
            status: ShipmentStatus.ASSIGNED_TO_DRIVER,
          },
          include: { payment: true, pricingSnapshot: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.shipment.findMany({
          where: {
            currentAssignedDriverId: driver.id,
            status: ShipmentStatus.OUT_FOR_DELIVERY,
          },
          include: { payment: true, pricingSnapshot: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.shipment.findMany({
          where: {
            currentAssignedDriverId: driver.id,
            status: ShipmentStatus.DELIVERED,
            updatedAt: { gte: todayStart },
          },
          include: { payment: true },
        }),
        prisma.shipment.findMany({
          where: {
            currentAssignedDriverId: driver.id,
            status: ShipmentStatus.DELIVERY_FAILED,
          },
          include: { payment: true },
        }),
      ]);

      // Calculate total COD pending collection for active delivery runs
      const codToCollect = outForDeliveryShipments.reduce((acc, s) => {
        if (s.paymentType === 'COD' && s.payment && s.payment.status === 'PENDING') {
          return acc + (s.payment.amountExpected || 0);
        }
        return acc;
      }, 0);

      return sendSuccess(res, {
        summary: {
          assignedCount: assignedShipments.length,
          outForDeliveryCount: outForDeliveryShipments.length,
          deliveredTodayCount: deliveredTodayShipments.length,
          failedCount: failedShipments.length,
          codToCollect,
        },
        assignedShipments,
        outForDeliveryShipments,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/driver/shipments/:id/start-delivery
 * Transitions an assigned shipment to OUT_FOR_DELIVERY
 */
router.post(
  '/shipments/:id/start-delivery',
  authenticate,
  requireRole([Role.DRIVER, Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const id = req.params.id;

      const shipment = await prisma.shipment.findUnique({
        where: { id },
        include: { customer: true },
      });

      if (!shipment) throw new AppError('Shipment not found.', 404, 'NOT_FOUND');

      if (user.role === Role.DRIVER && shipment.currentAssignedDriverId !== user.driverProfile?.id) {
        throw new AppError('You are not the assigned driver for this shipment.', 403, 'FORBIDDEN');
      }

      if (
        shipment.status !== ShipmentStatus.ASSIGNED_TO_DRIVER &&
        shipment.status !== ShipmentStatus.RESCHEDULED
      ) {
        throw new AppError(
          `Cannot start delivery from status ${shipment.status}. Must be ASSIGNED_TO_DRIVER or RESCHEDULED.`,
          400
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const s = await tx.shipment.update({
          where: { id },
          data: { status: ShipmentStatus.OUT_FOR_DELIVERY },
        });

        await tx.shipmentStatusHistory.create({
          data: {
            shipmentId: id,
            fromStatus: shipment.status,
            toStatus: ShipmentStatus.OUT_FOR_DELIVERY,
            actorUserId: user.id,
            actorRole: user.role,
            note: 'Driver has departed hub. Package is out for delivery.',
          },
        });

        return s;
      });

      await NotificationService.sendNotification({
        userId: shipment.customer.userId,
        title: 'Out for Delivery!',
        body: `Driver has departed with your package ${shipment.trackingNumber}. Please be available.`,
        relatedShipmentId: shipment.id,
      });

      return sendSuccess(res, { shipment: updated, message: 'Shipment marked as OUT_FOR_DELIVERY.' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
