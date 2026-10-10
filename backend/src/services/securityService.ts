import { prisma } from '../lib/prisma';
import { SecurityLogLevel } from '@prisma/client';

export interface SecurityEvent {
  level: SecurityLogLevel;
  eventType: string;
  details?: string;
  ip?: string;
  userId?: number;
}

export async function logSecurityEvent(evt: SecurityEvent): Promise<void> {
  try {
    await prisma.securityLog.create({
      data: {
        level: evt.level,
        eventType: evt.eventType,
        details: evt.details,
        ip: evt.ip,
        userId: evt.userId,
      },
    });
  } catch (err) {
    console.error('[Security] failed to write security log', err);
  }
}

// ---------------------------------------------------------------------------
// Lightweight anomaly detection (requirement 72). Detectors run on demand
// from middleware/service call sites and record Security Alerts.
// ---------------------------------------------------------------------------

export async function checkMultiAccountFromIp(ip: string, windowHours = 24): Promise<void> {
  const since = new Date(Date.now() - windowHours * 3600 * 1000);
  const count = await prisma.user.count({ where: { lastLoginIp: ip, createdAt: { gte: since } } });
  if (count >= 3) {
    await logSecurityEvent({
      level: 'WARNING',
      eventType: 'MULTI_ACCOUNT_IP',
      details: `${count} distinct accounts observed from IP ${ip} within ${windowHours}h`,
      ip,
    });
  }
}

export async function checkFailedLogins(ip: string): Promise<void> {
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const count = await prisma.securityLog.count({
    where: { eventType: 'FAILED_LOGIN', ip, createdAt: { gte: since } },
  });
  if (count >= 5) {
    await logSecurityEvent({
      level: 'CRITICAL',
      eventType: 'FAILED_LOGIN',
      details: `${count} failed login attempts from IP ${ip} in the last 15 minutes`,
      ip,
    });
  }
}

export async function checkPriceBurst(userId: number): Promise<void> {
  const since = new Date(Date.now() - 60 * 1000);
  const count = await prisma.securityLog.count({
    where: { userId, eventType: 'PRICE_QUERY', createdAt: { gte: since } },
  });
  if (count >= 30) {
    await logSecurityEvent({
      level: 'WARNING',
      eventType: 'PRICE_BURST',
      details: `User ${userId} queried prices ${count} times in 60 seconds`,
      userId,
    });
  }
}
