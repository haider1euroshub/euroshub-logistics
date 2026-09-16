import { Prisma, Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export class AuditService {
  static async log(params: {
    actorUserId?: string | null;
    actorRole?: Role | null;
    action: string;
    entityType: string;
    entityId: string;
    metadataJson?: any;
    tx?: Prisma.TransactionClient;
  }) {
    const db = params.tx || prisma;
    return db.auditLog.create({
      data: {
        actorUserId: params.actorUserId || null,
        actorRole: params.actorRole || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadataJson: params.metadataJson || undefined,
      },
    });
  }
}
