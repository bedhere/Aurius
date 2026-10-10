import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, badRequest, notFound } from '../lib/response';
import { getPerformanceStats } from '../services/performanceService';
import { audit } from '../services/auditService';

function ipOf(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

// --- Settings ---------------------------------------------------------------

const SETTING_KEYS = ['BANK_ACCOUNT', 'SHIPPING_METHODS', 'COMPANY_CONTACT', 'HOMEPAGE_MEDIA', 'DEALER_LOCATIONS'];

export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await prisma.systemSetting.findMany({ where: { key: { in: SETTING_KEYS } } });
    const map: Record<string, unknown> = {};
    for (const s of settings) {
      try {
        map[s.key] = JSON.parse(s.value);
      } catch {
        map[s.key] = s.value;
      }
    }
    ok(res, map);
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    for (const key of Object.keys(body)) {
      if (!SETTING_KEYS.includes(key)) continue;
      await prisma.systemSetting.upsert({
        where: { key },
        create: { key, value: JSON.stringify(body[key]), category: 'GENERAL' },
        update: { value: JSON.stringify(body[key]) },
      });
    }
    await audit({ userId: req.auth!.uid, action: 'SETTINGS_CHANGED', targetType: 'Settings', details: { keys: Object.keys(body) }, ip: ipOf(req) });
    ok(res, null, 'Settings saved');
  } catch (err) {
    next(err);
  }
}

// --- Performance dashboard ---------------------------------------------------

export async function performanceStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupBy = (req.query.groupBy as string) ?? 'month';
    const start = req.query.start ? new Date(String(req.query.start)) : undefined;
    const end = req.query.end ? new Date(String(req.query.end)) : undefined;
    const allowed = ['member', 'state', 'role', 'category', 'day', 'week', 'month', 'quarter', 'year'];
    if (!allowed.includes(groupBy)) throw badRequest('Invalid groupBy');
    const rows = await getPerformanceStats({ groupBy: groupBy as never, start, end });
    ok(res, { groupBy, start: start?.toISOString(), end: end?.toISOString(), rows });
  } catch (err) {
    next(err);
  }
}

export async function exportPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const format = (req.query.format as string) ?? 'xlsx';
    const groupBy = (req.query.groupBy as string) ?? 'member';
    const start = req.query.start ? new Date(String(req.query.start)) : undefined;
    const end = req.query.end ? new Date(String(req.query.end)) : undefined;
    const rows = await getPerformanceStats({ groupBy: groupBy as never, start, end });
    const rowData = rows.map((r) => ({ key: r.key, sales: r.sales, orders: r.orders, units: r.units, referrals: r.referrals }));
    const columns = [
      { header: groupBy.toUpperCase(), key: 'key' },
      { header: 'Sales (AUD)', key: 'sales' },
      { header: 'Orders', key: 'orders' },
      { header: 'Units', key: 'units' },
      { header: 'Referral Sales (AUD)', key: 'referrals' },
    ];

    if (format === 'pdf') {
      const { buildPdfBuffer } = await import('../services/exportService');
      const buf = await buildPdfBuffer(
        `AURIUS Performance Report — by ${groupBy}`,
        [
          { label: 'Period', value: `${start?.toISOString().slice(0, 10) ?? 'All time'} to ${end?.toISOString().slice(0, 10) ?? 'now'}` },
          { label: 'Generated', value: new Date().toISOString().slice(0, 19).replace('T', ' ') },
        ],
        columns,
        rowData as Record<string, unknown>[],
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="aurius-performance.pdf"');
      res.send(buf);
      return;
    }
    const { buildExcelBuffer } = await import('../services/exportService');
    const buf = buildExcelBuffer('Performance', columns, rowData as Record<string, unknown>[]);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="aurius-performance.xlsx"');
    res.send(buf);
  } catch (err) {
    next(err);
  }
}

// --- Installations & referrals ----------------------------------------------

export async function adminInstallations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) ?? '20', 10) || 20));
    const where = search
      ? { OR: [{ technicianAurId: { contains: search } }, { productName: { contains: search } }, { serialNumber: { contains: search } }] }
      : {};
    const [total, items] = await Promise.all([
      prisma.installationRecord.count({ where }),
      prisma.installationRecord.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    ok(res, {
      total,
      page,
      pageSize,
      items: items.map((item) => ({
        ...item,
        contactEmail: item.contactEmail ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function adminConfirmInstallation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const record = await prisma.installationRecord.findUnique({ where: { id } });
    if (!record) throw notFound('Record not found');
    await prisma.installationRecord.update({
      where: { id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
    if (record.technicianUserId) {
      await prisma.memberProfile.update({
        where: { userId: record.technicianUserId },
        data: { totalInstalledUnits: { increment: 1 } },
      });
    }
    await audit({ userId: req.auth!.uid, action: 'INSTALLATION_REGISTERED', targetType: 'Installation', targetId: String(id), details: { confirmed: true }, ip: ipOf(req) });
    ok(res, null, 'Installation confirmed');
  } catch (err) {
    next(err);
  }
}

export async function adminReferrals(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) ?? '20', 10) || 20));
    const [total, items] = await Promise.all([
      prisma.referralSale.count(),
      prisma.referralSale.findMany({
        include: { order: { select: { orderNumber: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    ok(res, { total, page, pageSize, items });
  } catch (err) {
    next(err);
  }
}

// --- Logs -------------------------------------------------------------------

export async function emailLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) ?? '20', 10) || 20));
    const [total, items] = await Promise.all([
      prisma.emailLog.count(),
      prisma.emailLog.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    ok(res, { total, page, pageSize, items });
  } catch (err) {
    next(err);
  }
}

export async function auditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) ?? '20', 10) || 20));
    const search = req.query.search as string | undefined;
    const where = search
      ? { OR: [{ targetType: { contains: search } }, { targetId: { contains: search } }] }
      : {};
    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { email: true } } },
      }),
    ]);
    ok(res, { total, page, pageSize, items });
  } catch (err) {
    next(err);
  }
}

export async function securityLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) ?? '20', 10) || 20));
    const level = req.query.level as string | undefined;
    const where = level ? { level: level as never } : {};
    const [total, items] = await Promise.all([
      prisma.securityLog.count({ where }),
      prisma.securityLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    ok(res, { total, page, pageSize, items });
  } catch (err) {
    next(err);
  }
}
