import { prisma } from '../lib/prisma';
import { PaymentStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// Performance accounting (requirements 51-53).
// - Only successfully PAID orders are credited.
// - Refunds generate a PerformanceAdjustment record and decrement profile
//   totals; history is never overwritten.
// ---------------------------------------------------------------------------

export async function creditOrderPerformance(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  if (order.paymentStatus !== PaymentStatus.PAID) return; // strict rule
  if (order.userId == null) return;
  const existing = await prisma.performanceRecord.findUnique({ where: { orderId } });
  if (existing) return; // idempotent

  const memberId = await prisma.memberId.findUnique({ where: { userId: order.userId } });

  const record = await prisma.performanceRecord.create({
    data: {
      orderId,
      userId: order.userId,
      aurId: memberId?.aurId ?? String(order.userId),
      salesAmount: order.total,
      orderCount: 1,
      creditedAt: new Date(),
    },
  });

  // Keep member profile aggregates in sync (source of truth remains the
  // PerformanceRecord rows; these columns are a reporting cache).
  const now = new Date();
  await prisma.memberProfile.update({
    where: { userId: order.userId },
    data: {
      totalSales: { increment: order.total },
      totalOrders: { increment: 1 },
      monthSales: { increment: order.total },
      yearSales: { increment: order.total },
      lastOrderAt: order.orderedAt,
    },
  });
  // month/year roll-over corrections are computed dynamically in reports from
  // PerformanceRecord.creditedAt, so cached month/year fields are informational.
  void now;

  // Referral crediting (requirement 54): paid order → link referral to technician
  if (order.referralTechId || order.referralEmail) {
    const technician = await prisma.memberId.findFirst({
      where: order.referralTechId ? { aurId: order.referralTechId } : undefined,
      include: { user: true },
    });
    let techUser: { id: number } | null = technician?.user ?? null;
    if (!techUser && order.referralEmail) {
      techUser = await prisma.user.findUnique({ where: { email: order.referralEmail } });
    }
    await prisma.referralSale.upsert({
      where: { orderId },
      create: {
        orderId,
        referralTechId: order.referralTechId,
        referralEmail: order.referralEmail,
        technicianUserId: techUser?.id ?? null,
        orderAmount: order.total,
        creditedAmount: order.total,
        status: 'CREDITED',
        creditedAt: new Date(),
      },
      update: {
        technicianUserId: techUser?.id ?? undefined,
        orderAmount: order.total,
        creditedAmount: order.total,
        status: 'CREDITED',
        creditedAt: new Date(),
      },
    });
  }

  void record;
}

export async function getUserPerformance(userId: number) {
  const profile = await prisma.memberProfile.findUnique({ where: { userId } });
  const records = await prisma.performanceRecord.findMany({ where: { userId } });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  let totalSales = 0;
  let monthSales = 0;
  let yearSales = 0;
  let totalOrders = 0;
  for (const r of records) {
    // ADJUSTED records keep their adjustments; compute net via adjustments
    const adjustments = await prisma.performanceAdjustment.findMany({
      where: { performanceId: r.id },
    });
    let net = r.salesAmount;
    for (const a of adjustments) net += a.adjustedAmount;
    totalSales += net;
    totalOrders += 1;
    if (r.creditedAt >= monthStart) monthSales += net;
    if (r.creditedAt >= yearStart) yearSales += net;
  }

  const installations = await prisma.installationRecord.count({
    where: { technicianUserId: userId, status: 'CONFIRMED' },
  });

  return {
    totalOrders,
    totalSales: Math.round(totalSales * 100) / 100,
    monthSales: Math.round(monthSales * 100) / 100,
    yearSales: Math.round(yearSales * 100) / 100,
    totalInstalledUnits: installations + (profile?.totalInstalledUnits ?? 0),
    adjustments: await prisma.performanceAdjustment.findMany({
      where: { performance: { userId } },
      orderBy: { adjustedAt: 'desc' },
      take: 50,
      include: { performance: true },
    }),
  };
}

export async function getPerformanceStats(filter: {
  groupBy: 'member' | 'state' | 'role' | 'category' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  start?: Date;
  end?: Date;
}) {
  const where: { creditedAt?: { gte?: Date; lte?: Date } } = {};
  if (filter.start || filter.end) {
    where.creditedAt = {};
    if (filter.start) where.creditedAt.gte = filter.start;
    if (filter.end) where.creditedAt.lte = filter.end;
  }
  const records = await prisma.performanceRecord.findMany({
    where,
    include: { order: { include: { items: { include: { product: true } } } }, adjustments: true },
  });

  const rows: Record<string, { sales: number; orders: number; units: number; referrals: number }> = {};
  const net = (r: (typeof records)[number]) =>
    r.adjustments.reduce((acc, a) => acc + a.adjustedAmount, r.salesAmount);

  for (const r of records) {
    let key = '';
    switch (filter.groupBy) {
      case 'member':
        key = r.aurId ?? 'Unknown';
        break;
      case 'state': {
        const order = r.order;
        key = order?.shippingState ?? 'Unknown';
        break;
      }
      case 'role': {
        const order = r.order;
        key = `Level ${order?.priceLevel ?? '?'}`;
        break;
      }
      case 'category': {
        const cats = new Set((r.order?.items ?? []).map((i) => i.product?.category ?? 'Other'));
        key = [...cats].join(', ') || 'Other';
        break;
      }
      case 'day':
        key = r.creditedAt.toISOString().slice(0, 10);
        break;
      case 'week': {
        const d = new Date(r.creditedAt);
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        key = `W${monday.toISOString().slice(0, 10)}`;
        break;
      }
      case 'month':
        key = r.creditedAt.toISOString().slice(0, 7);
        break;
      case 'quarter': {
        const d = r.creditedAt;
        key = `Q${Math.floor(d.getMonth() / 3) + 1}-${d.getFullYear()}`;
        break;
      }
      case 'year':
        key = String(r.creditedAt.getFullYear());
        break;
    }
    if (!rows[key]) rows[key] = { sales: 0, orders: 0, units: 0, referrals: 0 };
    rows[key].sales += net(r);
    rows[key].orders += 1;
    rows[key].units += (r.order?.items ?? []).reduce((acc, i) => acc + i.quantity, 0);
  }

  const referrals = await prisma.referralSale.findMany({
    where: { creditedAt: { gte: filter.start ?? new Date(0), lte: filter.end ?? new Date() } },
  });
  for (const ref of referrals) {
    const key = filter.groupBy === 'member' ? (ref.referralTechId ?? ref.referralEmail ?? 'Unknown') : 'Referrals';
    if (!rows[key]) rows[key] = { sales: 0, orders: 0, units: 0, referrals: 0 };
    rows[key].referrals += ref.orderAmount;
  }

  return Object.entries(rows)
    .map(([key, v]) => ({
      key,
      sales: Math.round(v.sales * 100) / 100,
      orders: v.orders,
      units: v.units,
      referrals: Math.round(v.referrals * 100) / 100,
    }))
    .sort((a, b) => b.sales - a.sales);
}
