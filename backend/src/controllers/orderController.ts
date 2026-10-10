import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, badRequest, notFound, created } from '../lib/response';
import { createOrderFromCart, createGuestOrder, cancelOrder, getShippingMethods } from '../services/orderService';
import { CheckoutInput, GuestCheckoutInput } from '../services/orderService';
import { OrderStatus, PaymentStatus } from '@prisma/client';

function ipOf(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

export async function checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as CheckoutInput;
    const user = await prisma.user.findUnique({ where: { id: req.auth!.uid } });
    if (!user) throw badRequest('User not found');
    const result = await createOrderFromCart(user, input, ipOf(req));
    created(res, result, 'Order created');
  } catch (err) {
    next(err);
  }
}

export async function guestCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as GuestCheckoutInput;
    const result = await createGuestOrder(input, ipOf(req));
    created(res, result, 'Guest order created');
  } catch (err) {
    next(err);
  }
}

export async function shippingMethods(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ok(res, await getShippingMethods());
  } catch (err) {
    next(err);
  }
}

export async function myOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.auth!.uid;
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt((req.query.pageSize as string) ?? '10', 10) || 10));
    const status = req.query.status as string | undefined;

    const where = {
      userId,
      ...(status ? { status: status as OrderStatus } : {}),
    };
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: { include: { product: { select: { images: true, name: true } } } },
          shipment: true,
        },
      }),
    ]);

    ok(res, {
      total,
      page,
      pageSize,
      items: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.orderedAt,
        total: o.total,
        currency: o.currency,
        status: o.status,
        paymentStatus: o.paymentStatus,
        shipmentStatus: o.shipmentStatus,
        itemCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
        firstImage: (() => { try { return JSON.parse(o.items[0]?.product?.images || '[]')[0] ?? null; } catch { return null; } })(),
        productSummary: o.items.map((i) => `${i.productName} x${i.quantity}`).join(', '),
        trackingNumber: o.shipment?.trackingNumber ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function orderDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = parseInt(req.params.id, 10);
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.auth!.uid },
      include: {
        items: true,
        payments: { include: { receipts: true } },
        shipment: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw notFound('Order not found');
    ok(res, {
      id: order.id,
      orderNumber: order.orderNumber,
      memberAurId: order.memberAurId,
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
      items: order.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.productName,
        sku: i.sku,
        variantId: i.variantId,
        variantName: i.variantName,
        variantAttributes: i.variantAttributes ? (() => { try { return JSON.parse(i.variantAttributes); } catch { return null; } })() : null,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
      })),
      payments: order.payments.map((p) => ({
        id: p.id,
        method: p.method,
        provider: p.provider,
        amount: p.amount,
        status: p.status,
        transactionId: p.transactionId,
        reference: p.reference,
        paidAt: p.paidAt,
        receipts: p.receipts.map((r) => ({ id: r.id, originalName: r.originalName, uploadedAt: r.uploadedAt, status: r.status })),
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
      statusHistory: order.statusHistory.map((h) => ({
        from: h.fromStatus,
        to: h.toStatus,
        note: h.note,
        at: h.createdAt,
        by: h.changedBy,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelMyOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = parseInt(req.params.id, 10);
    await cancelOrder(orderId, req.auth!.uid, ipOf(req));
    ok(res, null, 'Order cancelled');
  } catch (err) {
    next(err);
  }
}
