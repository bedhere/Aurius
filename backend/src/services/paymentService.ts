import { prisma } from '../lib/prisma';
import { config } from '../config';
import { audit } from './auditService';
import { sendMail } from './mailService';
import { creditOrderPerformance } from './performanceService';
import { setOrderStatus } from './orderService';
import {
  GatewayStatus,
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  ShipmentStatus,
} from '@prisma/client';
import { badRequest } from '../lib/response';

async function findOrderForPayment(orderId: number, userId?: number, guestToken?: string) {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      ...(typeof userId === 'number' ? { userId } : guestToken ? { guestToken } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// Payment architecture (requirements 37-39, 45).
// - PayPal: real REST integration, driven by PAYPAL_CLIENT_ID/SECRET in .env.
// - Stripe (credit card): Checkout Session, driven by STRIPE_SECRET_KEY.
// - Bank Transfer: always available; member uploads a receipt, admin verifies.
// - Sandbox gateway: local dev only — clearly separated adapter.
// No card numbers or CVV are ever stored.
// ---------------------------------------------------------------------------

export function paypalConfigured(): boolean {
  return Boolean(config.paypal.clientId && config.paypal.secret);
}

export function stripeConfigured(): boolean {
  return Boolean(config.stripe.secretKey);
}

export function availablePaymentMethods(): string[] {
  const list: string[] = ['BANK_TRANSFER'];
  if (paypalConfigured()) list.unshift('PAYPAL');
  if (stripeConfigured()) list.unshift('CREDIT_CARD');
  if (config.sandboxPayments && config.env !== 'production') list.unshift('SANDBOX');
  return list;
}

// --- Bank transfer details come from admin-configurable settings -----------

export async function getBankTransferDetails(): Promise<Record<string, string>> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'BANK_ACCOUNT' } });
  if (setting) {
    try {
      return JSON.parse(setting.value);
    } catch {
      /* fall through */
    }
  }
  return {
    bankName: 'Not configured — set via Admin > Settings',
    bsb: '-',
    accountName: '-',
    accountNumber: '-',
  };
}

// --- Central "mark paid" path (used by gateway capture AND manual verify) ---

export async function markOrderPaid(
  orderId: number,
  paymentId: number,
  transactionId: string,
  paidAt: Date,
  note = '',
  changedBy: number | null = null,
  ip?: string,
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, items: true },
  });
  if (!order) throw badRequest('Order not found');
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw badRequest('Payment not found');
  if (payment.status === PaymentStatus.PAID) return; // idempotent

  const memberId = order.userId ? await prisma.memberId.findUnique({ where: { userId: order.userId } }) : null;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        gatewayStatus: GatewayStatus.CAPTURED,
        transactionId,
        paidAt,
      },
    });
    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        status: OrderStatus.PAID,
        paidAt,
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: OrderStatus.PAID,
        note: note || 'Payment confirmed',
        changedBy,
        ip,
      },
    });
  });

  // Performance credit: only member-backed orders count (requirement 52)
  if (order.userId) {
    await creditOrderPerformance(orderId);
  }

  await audit({
    userId: changedBy,
    action: 'PAYMENT_CONFIRMED',
    targetType: 'Order',
    targetId: order.orderNumber,
    details: { transactionId, amount: payment.amount },
    ip,
  });

  const recipient = order.user?.email ?? order.guestEmail ?? '';
  if (!recipient) return;

  await sendMail({
    to: recipient,
    template: 'PAYMENT_CONFIRMED',
    userId: order.userId ?? null,
    data: {
      orderNumber: order.orderNumber,
      memberId: memberId?.aurId ?? 'Guest',
      amount: payment.amount,
      paymentTime: paidAt.toISOString(),
      transactionId,
      paymentMethod: payment.method,
      orderStatus: OrderStatus.PAID,
    },
  });
}

// --- PayPal adapter ---------------------------------------------------------

async function paypalApiBase(): Promise<string> {
  return config.paypal.env === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

async function paypalAccessToken(): Promise<string> {
  const base = await paypalApiBase();
  const auth = Buffer.from(`${config.paypal.clientId}:${config.paypal.secret}`).toString('base64');
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export async function createPaypalPayment(
  orderId: number,
  userId?: number,
  guestToken?: string,
): Promise<{ paymentId: number; approvalUrl: string | null; orderNumber: string }> {
  if (!paypalConfigured()) throw badRequest('PayPal is not configured');
  const order = await findOrderForPayment(orderId, userId, guestToken);
  if (!order) throw badRequest('Order not found');
  if (order.paymentStatus === PaymentStatus.PAID) throw badRequest('Order already paid');

  const token = await paypalAccessToken();
  const base = await paypalApiBase();
  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: order.orderNumber,
          amount: { currency_code: 'AUD', value: order.total.toFixed(2) },
        },
      ],
      application_context: {
        brand_name: 'AURIUS',
        return_url: `${config.appUrl}/api/payments/paypal/return/${order.id}`,
      cancel_url: order.userId ? `${config.frontendUrl}/member/orders/${order.id}` : `${config.frontendUrl}/guest-checkout?orderId=${order.id}&token=${encodeURIComponent(order.guestToken ?? '')}`,
      },
    }),
  });
  if (!res.ok) throw badRequest(`PayPal order creation failed: ${res.status}`);
  const json = (await res.json()) as { id: string; links: { href: string; rel: string }[] };

  const payment = await prisma.payment.create({
    data: {
      orderId,
      method: PaymentMethod.PAYPAL,
      provider: PaymentProvider.PAYPAL,
      amount: order.total,
      status: PaymentStatus.PROCESSING,
      gatewayStatus: GatewayStatus.CREATED,
      transactionId: json.id,
    },
  });
  const approval = json.links.find((l) => l.rel === 'approve');
  return { paymentId: payment.id, approvalUrl: approval?.href ?? null, orderNumber: order.orderNumber };
}

export async function capturePaypalPayment(orderId: number, paypalOrderId: string): Promise<void> {
  const token = await paypalAccessToken();
  const base = await paypalApiBase();
  const res = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw badRequest(`PayPal capture failed: ${res.status}`);
  const json = (await res.json()) as {
    status: string;
    purchase_units: { payments: { captures: { id: string }[] } }[];
  };
  if (json.status !== 'COMPLETED') throw badRequest(`PayPal capture not completed: ${json.status}`);
  const payment = await prisma.payment.findFirst({
    where: { orderId, provider: PaymentProvider.PAYPAL, status: PaymentStatus.PROCESSING },
    orderBy: { createdAt: 'desc' },
  });
  if (!payment) throw badRequest('Payment record not found');
  const captureId = json.purchase_units[0]?.payments?.captures?.[0]?.id ?? paypalOrderId;
  await markOrderPaid(orderId, payment.id, captureId, new Date());
}

// --- Stripe adapter (credit card) ------------------------------------------

export async function createStripePayment(
  orderId: number,
  userId?: number,
  guestToken?: string,
): Promise<{ paymentId: number; checkoutUrl: string | null; orderNumber: string }> {
  if (!stripeConfigured()) throw badRequest('Credit card payments are not configured');
  const order = await findOrderForPayment(orderId, userId, guestToken);
  if (!order) throw badRequest('Order not found');
  if (order.paymentStatus === PaymentStatus.PAID) throw badRequest('Order already paid');

  const params = new URLSearchParams({
    'payment_method_types[]': 'card',
    'mode': 'payment',
    'line_items[0][price_data][currency]': 'aud',
    'line_items[0][price_data][unit_amount]': String(Math.round(order.total * 100)),
    'line_items[0][price_data][product_data][name]': `AURIUS Order ${order.orderNumber}`,
    'line_items[0][quantity]': '1',
    'success_url': order.userId ? `${config.frontendUrl}/member/orders/${order.id}?paid=1` : `${config.frontendUrl}/guest-checkout?orderId=${order.id}&token=${encodeURIComponent(order.guestToken ?? '')}&paid=1`,
    'cancel_url': order.userId ? `${config.frontendUrl}/member/orders/${order.id}` : `${config.frontendUrl}/guest-checkout?orderId=${order.id}&token=${encodeURIComponent(order.guestToken ?? '')}`,
    'client_reference_id': order.orderNumber,
  });

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.stripe.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw badRequest(`Stripe session creation failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { id: string; url: string | null };

  const payment = await prisma.payment.create({
    data: {
      orderId,
      method: PaymentMethod.CREDIT_CARD,
      provider: PaymentProvider.STRIPE,
      amount: order.total,
      status: PaymentStatus.PROCESSING,
      gatewayStatus: GatewayStatus.CREATED,
      transactionId: json.id,
    },
  });
  return { paymentId: payment.id, checkoutUrl: json.url, orderNumber: order.orderNumber };
}

// Webhook target: verifies signature, then marks the order paid.
export async function handleStripeWebhook(rawBody: string, signature: string): Promise<void> {
  if (!config.stripe.webhookSecret) throw badRequest('Stripe webhook not configured');
  // Signature verification requires the raw payload + secret. In production
  // use the stripe SDK; here we verify HMAC-SHA256 manually.
  const crypto = await import('crypto');
  const parts = signature.split(',');
  const tsPart = parts.find((p) => p.startsWith('t='))?.slice(2);
  const v1Part = parts.find((p) => p.startsWith('v1='))?.slice(3);
  if (!tsPart || !v1Part) throw badRequest('Invalid Stripe signature');
  const signed = `${tsPart}.${rawBody}`;
  const expected = crypto.createHmac('sha256', config.stripe.webhookSecret).update(signed).digest('hex');
  if (expected !== v1Part) throw badRequest('Stripe signature mismatch');

  const event = JSON.parse(rawBody) as { type: string; data: { object: { client_reference_id?: string; id: string } } };
  if (event.type !== 'checkout.session.completed') return;
  const orderNumber = event.data.object.client_reference_id;
  if (!orderNumber) return;
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) return;
  const payment = await prisma.payment.findFirst({
    where: { orderId: order.id, provider: PaymentProvider.STRIPE },
    orderBy: { createdAt: 'desc' },
  });
  if (!payment) return;
  await markOrderPaid(order.id, payment.id, event.data.object.id, new Date());
}

// --- Bank transfer ----------------------------------------------------------

export async function createBankTransferPayment(orderId: number, userId?: number, guestToken?: string): Promise<{ paymentId: number; reference: string; bank: Record<string, string> }> {
  const order = await findOrderForPayment(orderId, userId, guestToken);
  if (!order) throw badRequest('Order not found');
  const bank = await getBankTransferDetails();
  const reference = order.orderNumber;

  let payment = await prisma.payment.findFirst({
    where: { orderId, method: PaymentMethod.BANK_TRANSFER },
  });
  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        orderId,
        method: PaymentMethod.BANK_TRANSFER,
        provider: PaymentProvider.BANK_TRANSFER,
        amount: order.total,
        status: PaymentStatus.UNPAID,
        reference,
      },
    });
  }
  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.PENDING_PAYMENT, paymentStatus: PaymentStatus.UNPAID },
  });
  return { paymentId: payment.id, reference, bank };
}

// --- Sandbox gateway (dev only) ---------------------------------------------

export async function createSandboxPayment(orderId: number, userId?: number, guestToken?: string): Promise<{ paymentId: number }> {
  if (config.env === 'production' || !config.sandboxPayments) {
    throw badRequest('Sandbox payments are disabled');
  }
  const order = await findOrderForPayment(orderId, userId, guestToken);
  if (!order) throw badRequest('Order not found');
  const payment = await prisma.payment.create({
    data: {
      orderId,
      method: PaymentMethod.SANDBOX,
      provider: PaymentProvider.SANDBOX,
      amount: order.total,
      status: PaymentStatus.PROCESSING,
      gatewayStatus: GatewayStatus.CREATED,
    },
  });
  return { paymentId: payment.id };
}

export async function completeSandboxPayment(orderId: number): Promise<void> {
  if (config.env === 'production' || !config.sandboxPayments) {
    throw badRequest('Sandbox payments are disabled');
  }
  const payment = await prisma.payment.findFirst({
    where: { orderId, provider: PaymentProvider.SANDBOX, status: PaymentStatus.PROCESSING },
    orderBy: { createdAt: 'desc' },
  });
  if (!payment) throw badRequest('Sandbox payment not found');
  await markOrderPaid(orderId, payment.id, `SANDBOX-${Date.now()}`, new Date(), 'Sandbox simulated payment');
}

// --- Refund (requirement 53): deduction is recorded, never silently overwritten ---

export async function refundOrder(
  orderId: number,
  adminId: number,
  amount: number,
  reason: string,
  ip?: string,
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true, performance: true, user: true },
  });
  if (!order) throw badRequest('Order not found');
  if (order.paymentStatus !== PaymentStatus.PAID) throw badRequest('Only paid orders can be refunded');
  if (amount <= 0 || amount > order.total) throw badRequest('Invalid refund amount');

  const payment = order.payments.find((p) => p.status === PaymentStatus.PAID);
  if (!payment) throw badRequest('No paid payment record found');
  const performance = order.performance;
  const deductRatio = performance ? amount / order.total : 0;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REFUNDED,
        gatewayStatus: GatewayStatus.CANCELLED,
        refundedAt: new Date(),
        refundedAmount: amount,
      },
    });
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.REFUNDED,
        paymentStatus: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: OrderStatus.REFUNDED,
        note: `Refunded AUD ${amount.toFixed(2)}: ${reason}`,
        changedBy: adminId,
        ip,
      },
    });
    const userId = order.userId;
    if (performance && userId != null) {
      const adjusted = Math.round(performance.salesAmount * deductRatio * 100) / 100;
      await tx.performanceAdjustment.create({
        data: {
          performanceId: performance.id,
          paymentId: payment.id,
          orderId,
          type: 'REFUND',
          originalAmount: performance.salesAmount,
          adjustedAmount: -adjusted,
          resultingAmount: Math.round((performance.salesAmount - adjusted) * 100) / 100,
          reason,
          adjustedBy: adminId,
        },
      });
      await tx.performanceRecord.update({
        where: { id: performance.id },
        data: { status: 'ADJUSTED' },
      });
      // keep member profile totals in sync (auditable via adjustments)
      await tx.memberProfile.update({
        where: { userId },
        data: {
          totalSales: { decrement: adjusted },
        },
      });
      const now = new Date();
      if (performance.creditedAt.getFullYear() === now.getFullYear()) {
        await tx.memberProfile.update({
          where: { userId },
          data: { yearSales: { decrement: adjusted } },
        });
      }
      if (
        performance.creditedAt.getFullYear() === now.getFullYear() &&
        performance.creditedAt.getMonth() === now.getMonth()
      ) {
        await tx.memberProfile.update({
          where: { userId },
          data: { monthSales: { decrement: adjusted } },
        });
      }
    }
  });

  await audit({
    userId: adminId,
    action: 'PAYMENT_REFUNDED',
    targetType: 'Order',
    targetId: order.orderNumber,
    details: { amount, reason, performanceAdjusted: Boolean(performance) },
    ip,
  });
}

// --- Shipment transition used by admin --------------------------------------

export async function shipOrder(
  orderId: number,
  carrier: string,
  trackingNumber: string,
  trackingUrl: string,
  eta: string | null,
  adminId: number,
  ip?: string,
): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true } });
  if (!order) throw badRequest('Order not found');
  if (order.paymentStatus !== PaymentStatus.PAID) throw badRequest('Order is not paid yet');

  await prisma.$transaction(async (tx) => {
    await tx.shipment.upsert({
      where: { orderId },
      create: {
        orderId,
        carrier,
        trackingNumber,
        trackingUrl,
        estimatedDelivery: eta ? new Date(eta) : null,
        status: ShipmentStatus.SHIPPED,
        shippedAt: new Date(),
      },
      update: {
        carrier,
        trackingNumber,
        trackingUrl,
        estimatedDelivery: eta ? new Date(eta) : null,
        status: ShipmentStatus.SHIPPED,
        shippedAt: new Date(),
      },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { shipmentStatus: ShipmentStatus.SHIPPED, status: OrderStatus.SHIPPED, shippedAt: new Date() },
    });
    await tx.orderStatusHistory.create({
      data: { orderId, fromStatus: order.status, toStatus: OrderStatus.SHIPPED, note: `Shipped via ${carrier}`, changedBy: adminId, ip },
    });
  });

  const memberId = order.userId ? await prisma.memberId.findUnique({ where: { userId: order.userId } }) : null;
  const recipient = order.user?.email ?? order.guestEmail ?? '';
  if (!recipient) return;
  await sendMail({
    to: recipient,
    template: 'ORDER_SHIPPED',
    userId: order.userId ?? null,
    data: {
      orderNumber: order.orderNumber,
      memberId: memberId?.aurId ?? 'Guest',
      carrier,
      trackingNumber,
      trackingUrl,
      eta: eta ?? '',
    },
  });

  await audit({
    userId: adminId,
    action: 'SHIPMENT_CREATED',
    targetType: 'Order',
    targetId: order.orderNumber,
    details: { carrier, trackingNumber },
    ip,
  });
}

export async function markDelivered(orderId: number, adminId: number, ip?: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true, shipment: true } });
  if (!order) throw badRequest('Order not found');

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        shipmentStatus: ShipmentStatus.DELIVERED,
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
      },
    });
    if (order.shipment) {
      await tx.shipment.update({
        where: { id: order.shipment.id },
        data: { status: ShipmentStatus.DELIVERED, deliveredAt: new Date() },
      });
    }
    await tx.orderStatusHistory.create({
      data: { orderId, fromStatus: order.status, toStatus: OrderStatus.DELIVERED, note: 'Delivered', changedBy: adminId, ip },
    });
  });

  const recipient = order.user?.email ?? order.guestEmail ?? '';
  if (recipient) {
    await sendMail({
      to: recipient,
      template: 'ORDER_DELIVERED',
      userId: order.userId ?? null,
      data: { orderNumber: order.orderNumber },
    });
  }

  await audit({
    userId: adminId,
    action: 'SHIPMENT_STATUS_CHANGED',
    targetType: 'Order',
    targetId: order.orderNumber,
    details: { to: 'DELIVERED' },
    ip,
  });
}
