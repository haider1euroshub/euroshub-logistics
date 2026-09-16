import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export class TrackingService {
  /**
   * Generates a guaranteed unique tracking number: {PREFIX}-{YEAR}-{6-digit sequence}
   * Uses an atomic row update/upsert on TrackingCounter within a transaction or standalone.
   */
  static async generateTrackingNumber(tx?: Prisma.TransactionClient): Promise<string> {
    const db = tx || prisma;
    const currentYear = new Date().getFullYear();

    // 1. Fetch system settings for prefix
    const settings = await db.systemSettings.findUnique({
      where: { id: 'singleton' },
    });
    const prefix = settings?.trackingPrefix || 'ESH';

    // 2. Atomically increment the sequence for the current year
    const counter = await db.trackingCounter.upsert({
      where: { year: currentYear },
      update: {
        lastSequence: { increment: 1 },
      },
      create: {
        year: currentYear,
        lastSequence: 1001,
      },
    });

    const sequencePadded = String(counter.lastSequence).padStart(6, '0');
    return `${prefix}-${currentYear}-${sequencePadded}`;
  }
}
