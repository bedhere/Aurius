import { prisma } from '../lib/prisma';
import { AuditAction } from '@prisma/client';

export interface AuditInput {
  userId?: number | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export async function audit(log: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: log.userId ?? null,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        details: log.details ? JSON.stringify(log.details) : null,
        ip: log.ip,
        userAgent: log.userAgent,
      },
    });
  } catch (err) {
    console.error('[Audit] failed to write audit log', err);
  }
}
