import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { STATUS_LABELS } from '@eliteship/shared';
import { sendSuccess } from '../middleware/envelope.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

/**
 * GET /api/tracking/:trackingNumber
 * Public unauthenticated tracking endpoint.
 * Returns sanitized timeline with zero PII (no customer names, phone numbers, or full street addresses).
 */
router.get('/:trackingNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trackingNumber = req.params.trackingNumber.trim().toUpperCase();

    const shipment = await prisma.shipment.findUnique({
      where: { trackingNumber },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          select: {
            toStatus: true,
            createdAt: true,
            note: true,
          },
        },
      },
    });

    if (!shipment) {
      // Uniform 404 response to prevent tracking enumeration
      throw new AppError('Shipment not found.', 404, 'NOT_FOUND');
    }

    const sanitizedTimeline = shipment.statusHistory.map((item) => ({
      status: item.toStatus,
      statusLabel: STATUS_LABELS[item.toStatus] || item.toStatus,
      timestamp: item.createdAt,
      note: item.note || undefined,
    }));

    return sendSuccess(res, {
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      statusLabel: STATUS_LABELS[shipment.status] || shipment.status,
      serviceType: shipment.serviceType,
      originCity: shipment.senderCity,
      destinationCity: shipment.receiverCity,
      isFragile: shipment.isFragile,
      packageType: shipment.packageType,
      bookedAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
      timeline: sanitizedTimeline,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
