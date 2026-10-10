import { NextFunction, Request, Response } from 'express';
import path from 'path';
import { prisma } from '../lib/prisma';
import { ok, badRequest, notFound } from '../lib/response';
import { shipOrder, markDelivered, refundOrder, markOrderPaid } from '../services/paymentService';
import { safeDecrypt, SALT_PHONE } from '../lib/crypto';
import { audit } from '../services/auditService';
import { PaymentStatus } from '@prisma/client';

function ipOf(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

export async function adminListOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const paymentStatus = req.query.paymentStatus as string | undefined;
    const state = req.query.state as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) ?? '20', 10) || 20));

    const where = {
      ...(status ? { status: status as never } : {}),
      ...(paymentStatus ? { paymentStatus: paymentStatus as never } : {}),
      ...(state ? { shippingState: state } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search } },
              { memberAurId: { contains: search } },
              { user: { email: { contains: search } } },
            ],
          }
        : {}),
    };
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          items: true,
          user: { select: { email: true } },
          shipment: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    ok(res, {
      total,
      page,
      pageSize,
      items: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        memberAurId: o.memberAurId,
        email: o.user?.email ?? o.guestEmail ?? 'Guest',
      products: o.items.map((i) => `${i.productName}${i.variantName ? ` (${i.variantName})` : ''} x${i.quantity}`).join(', '),
        total: o.total,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.payments?.[0]?.method ?? null,
        shipmentStatus: o.shipmentStatus,
        carrier: o.shipment?.carrier ?? null,
        trackingNumber: o.shipment?.trackingNumber ?? null,
        orderedAt: o.orderedAt,
        paidAt: o.paidAt,
        shippingState: o.shippingState,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function adminOrderDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        user: { select: { id: true, email: true } },
        payments: { include: { receipts: true } },
        shipment: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        performance: { include: { adjustments: true } },
      },
    });
    if (!order) throw notFound('Order not found');
    ok(res, {
      id: order.id,
      orderNumber: order.orderNumber,
      memberAurId: order.memberAurId,
      email: order.user?.email ?? order.guestEmail ?? 'Guest',
      status: order.status,
      paymentStatus: order.paymentStatus,
      shipmentStatus: order.shipmentStatus,
      subtotal: order.subtotal,
      discount: order.discount,
      shippingFee: order.shippingFee,
      total: order.total,
      currency: order.currency,
      shipping: {
        name: order.shippingName,
        phone: order.shippingPhone,
        street: order.shippingStreet,
        suburb: order.shippingSuburb,
        state: order.shippingState,
        postcode: order.shippingPostcode,
        country: order.shippingCountry,
        method: order.shippingMethod,
      },
      notes: order.notes,
      referralTechId: order.referralTechId,
      referralEmail: order.referralEmail,
      orderedAt: order.orderedAt,
      paidAt: order.paidAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        variantId: item.variantId,
        variantName: item.variantName,
        variantAttributes: item.variantAttributes
          ? (() => { try { return JSON.parse(item.variantAttributes); } catch { return null; } })()
          : null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      payments: order.payments.map((payment) => ({
        id: payment.id,
        method: payment.method,
        provider: payment.provider,
        amount: payment.amount,
        status: payment.status,
        transactionId: payment.transactionId,
        reference: payment.reference,
        paidAt: payment.paidAt,
        receipts: payment.receipts.map((receipt) => ({
          id: receipt.id,
          originalName: receipt.originalName,
          uploadedAt: receipt.uploadedAt,
          status: receipt.status,
          url: `/uploads/receipts/${path.basename(receipt.filePath)}`,
        })),
      })),
      shipment: order.shipment
        ? {
            carrier: order.shipment.carrier,
            trackingNumber: order.shipment.trackingNumber,
            trackingUrl: order.shipment.trackingUrl,
            estimatedDelivery: order.shipment.estimatedDelivery,
            status: order.shipment.status,
            shippedAt: order.shipment.shippedAt,
            deliveredAt: order.shipment.deliveredAt,
          }
        : null,
      statusHistory: order.statusHistory.map((history) => ({
        from: history.fromStatus,
        to: history.toStatus,
        note: history.note,
        at: history.createdAt,
        by: history.changedBy,
      })),
      performance: order.performance
        ? {
            id: order.performance.id,
            salesAmount: order.performance.salesAmount,
            creditedAt: order.performance.creditedAt,
            adjustments: order.performance.adjustments.map((adjustment) => ({
              id: adjustment.id,
              type: adjustment.type,
              adjustedAmount: adjustment.adjustedAmount,
              reason: adjustment.reason,
              adjustedAt: adjustment.adjustedAt,
            })),
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function adminShipOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body as { carrier: string; trackingNumber: string; trackingUrl?: string; eta?: string | null };
    if (!body.carrier || !body.trackingNumber) throw badRequest('Carrier and tracking number are required');
    await shipOrder(id, body.carrier, body.trackingNumber, body.trackingUrl ?? '', body.eta ?? null, req.auth!.uid, ipOf(req));
    ok(res, null, 'Order shipped. Notification email sent.');
  } catch (err) {
    next(err);
  }
}

export async function adminDeliverOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    await markDelivered(id, req.auth!.uid, ipOf(req));
    ok(res, null, 'Order marked as delivered');
  } catch (err) {
    next(err);
  }
}

export async function adminRefundOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body as { amount: number; reason: string };
    if (!body.amount || !body.reason) throw badRequest('Amount and reason are required');
    await refundOrder(id, req.auth!.uid, body.amount, body.reason, ipOf(req));
    ok(res, null, 'Order refunded. Performance adjustment recorded.');
  } catch (err) {
    next(err);
  }
}

export async function adminListPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = req.query.status as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) ?? '20', 10) || 20));
    const where = status ? { status: status as PaymentStatus } : {};
    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: { order: { select: { orderNumber: true, memberAurId: true } }, receipts: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    ok(res, {
      total,
      page,
      pageSize,
      items: payments.map((p) => ({
        id: p.id,
        orderNumber: p.order.orderNumber,
        memberAurId: p.order.memberAurId,
        method: p.method,
        provider: p.provider,
        amount: p.amount,
        status: p.status,
        transactionId: p.transactionId,
        reference: p.reference,
        paidAt: p.paidAt,
        refundedAt: p.refundedAt,
        receipts: p.receipts.map((r) => ({
          id: r.id,
          originalName: r.originalName,
          status: r.status,
          uploadedAt: r.uploadedAt,
          url: `/uploads/receipts/${path.basename(r.filePath)}`,
        })),
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function adminVerifyReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const receiptId = parseInt(req.params.receiptId, 10);
    const body = req.body as { action: 'VERIFY' | 'REJECT'; note?: string };
    const receipt = await prisma.bankTransferReceipt.findUnique({
      where: { id: receiptId },
      include: { payment: { include: { order: { include: { user: true } } } } },
    });
    if (!receipt) throw notFound('Receipt not found');

    if (body.action === 'VERIFY') {
      await prisma.bankTransferReceipt.update({
        where: { id: receiptId },
        data: { status: 'VERIFIED', verifiedAt: new Date(), verifiedBy: req.auth!.uid },
      });
      await markOrderPaid(
        receipt.payment.orderId,
        receipt.payment.id,
        `BANK-${receipt.payment.reference ?? receipt.payment.id}`,
        new Date(),
        `Bank transfer verified by admin${body.note ? `: ${body.note}` : ''}`,
        req.auth!.uid,
        ipOf(req),
      );
      ok(res, null, 'Receipt verified. Order marked as paid.');
      return;
    }
    if (body.action === 'REJECT') {
      await prisma.bankTransferReceipt.update({
        where: { id: receiptId },
        data: { status: 'REJECTED', verifiedAt: new Date(), verifiedBy: req.auth!.uid },
      });
      await prisma.payment.update({ where: { id: receipt.payment.id }, data: { status: PaymentStatus.UNPAID } });
      await prisma.order.update({
        where: { id: receipt.payment.orderId },
        data: { paymentStatus: PaymentStatus.UNPAID, status: 'PENDING_PAYMENT' },
      });
      await audit({
        userId: req.auth!.uid,
        action: 'PAYMENT_CONFIRMED',
        targetType: 'Order',
        targetId: receipt.payment.order.orderNumber,
        details: { receiptRejected: true, note: body.note },
        ip: ipOf(req),
      });
      ok(res, null, 'Receipt rejected');
      return;
    }
    throw badRequest('Invalid action');
  } catch (err) {
    next(err);
  }
}

export async function adminExportOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { buildExcelBuffer } = await import('../services/exportService');
    const status = req.query.status as string | undefined;
    const paymentStatus = req.query.paymentStatus as string | undefined;
    const state = req.query.state as string | undefined;
    const orders = await prisma.order.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(paymentStatus ? { paymentStatus: paymentStatus as never } : {}),
        ...(state ? { shippingState: state } : {}),
      },
      include: { items: true, user: { select: { email: true } }, shipment: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      memberAurId: o.memberAurId,
      email: o.user?.email ?? o.guestEmail ?? 'Guest',
      products: o.items.map((i) => `${i.productName}${i.variantName ? ` (${i.variantName})` : ''} x${i.quantity}`).join('; '),
      total: o.total,
      paymentMethod: o.payments[0]?.method ?? '',
      paymentStatus: o.paymentStatus,
      paidAt: o.paidAt?.toISOString().slice(0, 19).replace('T', ' ') ?? '',
      shipmentStatus: o.shipmentStatus,
      carrier: o.shipment?.carrier ?? '',
      trackingNumber: o.shipment?.trackingNumber ?? '',
      shippingAddress: `${o.shippingStreet}, ${o.shippingSuburb}, ${o.shippingState} ${o.shippingPostcode}`,
      orderedAt: o.orderedAt.toISOString().slice(0, 19).replace('T', ' '),
      orderStatus: o.status,
    }));
    const buf = buildExcelBuffer(
      'Orders',
      [
        { header: 'Order Number', key: 'orderNumber' },
        { header: 'Member ID', key: 'memberAurId' },
        { header: 'Email', key: 'email' },
        { header: 'Products', key: 'products' },
        { header: 'Total Amount', key: 'total' },
        { header: 'Payment Method', key: 'paymentMethod' },
        { header: 'Payment Status', key: 'paymentStatus' },
        { header: 'Payment Time', key: 'paidAt' },
        { header: 'Shipment Status', key: 'shipmentStatus' },
        { header: 'Carrier', key: 'carrier' },
        { header: 'Tracking Number', key: 'trackingNumber' },
        { header: 'Shipping Address', key: 'shippingAddress' },
        { header: 'Order Time', key: 'orderedAt' },
        { header: 'Order Status', key: 'orderStatus' },
      ],
      rows,
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="aurius-orders.xlsx"');
    res.send(buf);
  } catch (err) {
    next(err);
  }
}
