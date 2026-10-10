import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok } from '../lib/response';
import { AccountStatus, ApplicationStatus, OrderStatus, PaymentStatus, ShipmentStatus } from '@prisma/client';
import { getPerformanceStats } from '../services/performanceService';

export async function dashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      pendingApplications,
      activeMembers,
      level1Count,
      level2Count,
      level3Count,
      todayOrders,
      monthOrders,
      monthSalesRows,
      yearSalesRows,
      pendingShipments,
    ] = await Promise.all([
      prisma.partnerApplication.count({ where: { status: { in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW] } } }),
      prisma.user.count({ where: { accountStatus: AccountStatus.ACTIVE, role: { not: 'ADMIN' } } }),
      prisma.user.count({ where: { role: 'REGIONAL_AGENT', accountStatus: AccountStatus.ACTIVE } }),
      prisma.user.count({ where: { role: 'LICENSED_TRADESMAN', accountStatus: AccountStatus.ACTIVE } }),
      prisma.user.count({ where: { role: 'SUB_DEALER', accountStatus: AccountStatus.ACTIVE } }),
      prisma.order.count({ where: { orderedAt: { gte: todayStart } } }),
      prisma.order.count({ where: { orderedAt: { gte: monthStart } } }),
      prisma.performanceRecord.aggregate({ where: { creditedAt: { gte: monthStart } }, _sum: { salesAmount: true } }),
      prisma.performanceRecord.aggregate({ where: { creditedAt: { gte: yearStart } }, _sum: { salesAmount: true } }),
      prisma.order.count({ where: { paymentStatus: PaymentStatus.PAID, shipmentStatus: { in: [ShipmentStatus.PENDING] } } }),
    ]);

    const [stateRanking, roleShare, productRanking] = await Promise.all([
      getPerformanceStats({ groupBy: 'state' }),
      getPerformanceStats({ groupBy: 'role' }),
      getPerformanceStats({ groupBy: 'category' }),
    ]);

    ok(res, {
      pendingApplications,
      activeMembers,
      level1Count,
      level2Count,
      level3Count,
      todayOrders,
      monthOrders,
      monthSales: monthSalesRows._sum.salesAmount ?? 0,
      yearSales: yearSalesRows._sum.salesAmount ?? 0,
      pendingShipments,
      stateRanking,
      roleShare,
      productRanking,
    });
  } catch (err) {
    next(err);
  }
}
