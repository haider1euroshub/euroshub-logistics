import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export class NotificationService {
  /**
   * Dispatches an in-app notification to a user.
   * Architecture supports future pluggable channels (SMS/Email) inside this method.
   */
  static async sendNotification(params: {
    userId: string;
    title: string;
    body: string;
    relatedShipmentId?: string;
    tx?: Prisma.TransactionClient;
  }) {
    const { userId, title, body, relatedShipmentId, tx } = params;
    const db = tx || prisma;

    const notification = await db.notification.create({
      data: {
        userId,
        title,
        body,
        relatedShipmentId,
        isRead: false,
      },
    });

    // In future: dispatch SMS / Email channel integrations here if enabled.

    return notification;
  }

  /**
   * Notify all system ADMIN users
   */
  static async notifyAdmins(params: {
    title: string;
    body: string;
    relatedShipmentId?: string;
    tx?: Prisma.TransactionClient;
  }) {
    const db = params.tx || prisma;
    const admins = await db.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });

    for (const admin of admins) {
      await this.sendNotification({
        userId: admin.id,
        title: params.title,
        body: params.body,
        relatedShipmentId: params.relatedShipmentId,
        tx: params.tx,
      });
    }
  }
}
