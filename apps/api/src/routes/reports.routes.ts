import { Router, Request, Response, NextFunction } from 'express';
import { Role, ShipmentStatus } from '@eliteship/shared';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../middleware/envelope.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { stringify } from 'csv-stringify';
import { formatDateTimePST } from '@eliteship/shared';

const router = Router();

function getDateRange(range?: string, from?: string, to?: string) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  if (range === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === 'week') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === 'month') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (from && to) {
    startDate = new Date(from);
    endDate = new Date(to);
  } else {
    // Default last 30 days
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate };
}

/**
 * GET /api/reports/summary
 * Aggregate metrics scoped to ADMIN or HUB_STAFF (filtered to their hub)
 */
router.get(
  '/summary',
  authenticate,
  requireRole([Role.ADMIN, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { startDate, endDate } = getDateRange(
        req.query.range as string,
        req.query.from as string,
        req.query.to as string
      );

      const where: any = {
        createdAt: { gte: startDate, lte: endDate },
      };

      if (user.role === Role.HUB_STAFF) {
        const staffHubId = user.hubStaffProfile?.hubId;
        where.OR = [{ originHubId: staffHubId }, { destinationHubId: staffHubId }];
      }

      const [
        totalCreated,
        inTransit,
        outForDelivery,
        delivered,
        failed,
        returned,
        activeDrivers,
        activeHubs,
        codPendingPayments,
        codCollectedPayments,
        revenueSnapshots,
      ] = await Promise.all([
        prisma.shipment.count({ where }),
        prisma.shipment.count({ where: { ...where, status: ShipmentStatus.IN_TRANSIT } }),
        prisma.shipment.count({ where: { ...where, status: ShipmentStatus.OUT_FOR_DELIVERY } }),
        prisma.shipment.count({ where: { ...where, status: ShipmentStatus.DELIVERED } }),
        prisma.shipment.count({ where: { ...where, status: ShipmentStatus.DELIVERY_FAILED } }),
        prisma.shipment.count({ where: { ...where, status: ShipmentStatus.RETURNED } }),
        prisma.driverProfile.count({ where: { user: { isActive: true } } }),
        prisma.hub.count({ where: { isActive: true } }),
        prisma.payment.aggregate({
          where: {
            paymentType: 'COD',
            status: 'PENDING',
            shipment: where,
          },
          _sum: { amountExpected: true },
        }),
        prisma.payment.aggregate({
          where: {
            paymentType: 'COD',
            status: 'COLLECTED',
            shipment: where,
          },
          _sum: { amountCollected: true },
        }),
        prisma.pricingSnapshot.aggregate({
          where: { shipment: where },
          _sum: { totalFee: true },
        }),
      ]);

      const terminalTotal = delivered + failed + returned;
      const successRate = terminalTotal > 0 ? (delivered / terminalTotal) * 100 : 0;

      return sendSuccess(res, {
        period: { from: startDate, to: endDate },
        metrics: {
          totalCreated,
          inTransit,
          outForDelivery,
          delivered,
          failed,
          returned,
          activeDrivers,
          activeHubs,
          successRate: Math.round(successRate * 10) / 10,
          codPending: codPendingPayments._sum.amountExpected || 0,
          codCollected: codCollectedPayments._sum.amountCollected || 0,
          totalRevenue: revenueSnapshots._sum.totalFee || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/reports/charts
 * Real aggregated chart data for recharts
 */
router.get(
  '/charts',
  authenticate,
  requireRole([Role.ADMIN, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { startDate, endDate } = getDateRange('month');

      const where: any = {
        createdAt: { gte: startDate, lte: endDate },
      };

      if (user.role === Role.HUB_STAFF) {
        const staffHubId = user.hubStaffProfile?.hubId;
        where.OR = [{ originHubId: staffHubId }, { destinationHubId: staffHubId }];
      }

      // 1. Status breakdown
      const statusCounts = await prisma.shipment.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      });

      // 2. City breakdown (destination)
      const cityCounts = await prisma.shipment.groupBy({
        by: ['receiverCity'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 8,
      });

      // 3. Driver performance (completed vs failed)
      const drivers = await prisma.driverProfile.findMany({
        where: { user: { isActive: true } },
        include: {
          user: { select: { fullName: true } },
          assignedShipments: {
            where: { createdAt: { gte: startDate } },
            select: { status: true },
          },
        },
        take: 10,
      });

      const driverPerformance = drivers.map((d) => {
        const completed = d.assignedShipments.filter((s) => s.status === ShipmentStatus.DELIVERED).length;
        const failed = d.assignedShipments.filter((s) => s.status === ShipmentStatus.DELIVERY_FAILED).length;
        return {
          name: d.user.fullName,
          completed,
          failed,
        };
      });

      return sendSuccess(res, {
        statusBreakdown: statusCounts.map((s) => ({ status: s.status, count: s._count.id })),
        cityBreakdown: cityCounts.map((c) => ({ city: c.receiverCity, count: c._count.id })),
        driverPerformance,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/reports/export
 * Streams CSV report
 */
router.get(
  '/export',
  authenticate,
  requireRole([Role.ADMIN, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const where: any = {};

      if (user.role === Role.HUB_STAFF) {
        const staffHubId = user.hubStaffProfile?.hubId;
        where.OR = [{ originHubId: staffHubId }, { destinationHubId: staffHubId }];
      }

      const shipments = await prisma.shipment.findMany({
        where,
        include: {
          pricingSnapshot: true,
          payment: true,
          originHub: true,
          destinationHub: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="euroshub-report.csv"');

      const stringifier = stringify({
        header: true,
        columns: [
          { key: 'trackingNumber', header: 'Tracking Number' },
          { key: 'status', header: 'Status' },
          { key: 'createdAt', header: 'Booking Date' },
          { key: 'serviceType', header: 'Service Type' },
          { key: 'paymentType', header: 'Payment Type' },
          { key: 'weightKg', header: 'Weight (kg)' },
          { key: 'senderCity', header: 'Origin City' },
          { key: 'receiverCity', header: 'Destination City' },
          { key: 'senderName', header: 'Sender' },
          { key: 'receiverName', header: 'Receiver' },
          { key: 'totalFee', header: 'Freight Fee (PKR)' },
          { key: 'amountExpected', header: 'Amount Expected (PKR)' },
          { key: 'amountCollected', header: 'Amount Collected (PKR)' },
          { key: 'paymentStatus', header: 'Payment Status' },
        ],
      });

      stringifier.pipe(res);

      for (const s of shipments) {
        stringifier.write({
          trackingNumber: s.trackingNumber,
          status: s.status,
          createdAt: formatDateTimePST(s.createdAt),
          serviceType: s.serviceType,
          paymentType: s.paymentType,
          weightKg: s.weightKg,
          senderCity: s.senderCity,
          receiverCity: s.receiverCity,
          senderName: s.senderName,
          receiverName: s.receiverName,
          totalFee: s.pricingSnapshot?.totalFee || 0,
          amountExpected: s.payment?.amountExpected || 0,
          amountCollected: s.payment?.amountCollected || 0,
          paymentStatus: s.payment?.status || 'PENDING',
        });
      }

      stringifier.end();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
