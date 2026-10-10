import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, badRequest, notFound } from '../lib/response';
import {
  availablePaymentMethods,
  createPaypalPayment,
  capturePaypalPayment,
  createStripePayment,
  createBankTransferPayment,
  createSandboxPayment,
  completeSandboxPayment,
  getBankTransferDetails,
  handleStripeWebhook,
} from '../services/paymentService';
import { audit } from '../services/auditService';
import { sendMail } from '../services/mailService';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

function ipOf(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

export async function paymentOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = parseInt(req.params.id, 10);
    const order = await prisma.order.findFirst({ where: { id: orderId, userId: req.auth!.uid } });
    if (!order) throw notFound('Order not found');
    ok(res, {
      methods: availablePaymentMethods(),
      orderNumber: order.orderNumber,
      total: order.total,
      bankTransfer: await getBankTransferDetails(),
      reference: order.orderNumber,
    });
  } catch (err) {
    next(err);
  }
}

export async function guestPaymentOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = parseInt(req.params.id, 10);
    const guestToken = req.params.token;
    const order = await prisma.order.findFirst({ where: { id: orderId, guestToken } });
    if (!order) throw notFound('Order not found');
    ok(res, {
      methods: availablePaymentMethods(),
      orderNumber: order.orderNumber,
      total: order.total,
      bankTransfer: await getBankTransferDetails(),
      reference: order.orderNumber,
    });
  } catch (err) {
    next(err);
  }
}

export async function choosePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { method } = req.body as { method: string };
    const userId = req.auth!.uid;

    switch (method) {
      case PaymentMethod.PAYPAL: {
        const r = await createPaypalPayment(orderId, userId);
        ok(res, r, 'PayPal payment created');
        return;
      }
      case PaymentMethod.CREDIT_CARD: {
        const r = await createStripePayment(orderId, userId);
        ok(res, r, 'Stripe checkout created');
        return;
      }
      case PaymentMethod.BANK_TRANSFER: {
        const r = await createBankTransferPayment(orderId, userId);
        ok(res, r, 'Bank transfer details ready');
        return;
      }
      case PaymentMethod.SANDBOX: {
        const r = await createSandboxPayment(orderId, userId);
        await completeSandboxPayment(orderId);
        ok(res, r, 'Sandbox payment completed');
        return;
      }
      default:
        throw badRequest(`Unsupported payment method: ${method}`);
    }
  } catch (err) {
    next(err);
  }
}

export async function guestChoosePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = parseInt(req.params.id, 10);
    const guestToken = req.params.token;
    const { method } = req.body as { method: string };

    switch (method) {
      case PaymentMethod.PAYPAL: {
        const r = await createPaypalPayment(orderId, undefined, guestToken);
        ok(res, r, 'PayPal payment created');
        return;
      }
      case PaymentMethod.CREDIT_CARD: {
        const r = await createStripePayment(orderId, undefined, guestToken);
        ok(res, r, 'Stripe checkout created');
        return;
      }
      case PaymentMethod.BANK_TRANSFER: {
        const r = await createBankTransferPayment(orderId, undefined, guestToken);
        ok(res, r, 'Bank transfer details ready');
        return;
      }
      case PaymentMethod.SANDBOX: {
        const r = await createSandboxPayment(orderId, undefined, guestToken);
        await completeSandboxPayment(orderId);
        ok(res, r, 'Sandbox payment completed');
        return;
      }
      default:
        throw badRequest(`Unsupported payment method: ${method}`);
    }
  } catch (err) {
    next(err);
  }
}

export async function paypalReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = parseInt(req.params.id, 10);
    const paypalOrderId = (req.query.token as string) ?? '';
    await capturePaypalPayment(orderId, paypalOrderId);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order?.userId) {
      res.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/member/orders/${orderId}?paid=1`);
      return;
    }
    res.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/guest-checkout?orderId=${orderId}&token=${encodeURIComponent(order?.guestToken ?? '')}&paid=1`);
  } catch (err) {
    next(err);
  }
}

export async function uploadBankReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.auth!.uid;
    const file = req.file;
    if (!file) throw badRequest('No file uploaded');

    const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw notFound('Order not found');
    let payment = await prisma.payment.findFirst({
      where: { orderId, method: PaymentMethod.BANK_TRANSFER },
    });
    if (!payment) {
      const r = await createBankTransferPayment(orderId, userId);
      payment = await prisma.payment.findUnique({ where: { id: r.paymentId } });
    }
    if (!payment) throw badRequest('Payment record not found');

    const receipt = await prisma.bankTransferReceipt.create({
      data: {
        paymentId: payment.id,
        filePath: file.path.replace(/\\/g, '/'),
        originalName: file.originalname,
        mime: file.mimetype,
        size: file.size,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAYMENT_PROCESSING', paymentStatus: PaymentStatus.PROCESSING },
    });

    await audit({
      userId,
      action: 'FILE_UPLOADED',
      targetType: 'Payment',
      targetId: order.orderNumber,
      details: { receipt: receipt.id },
      ip: ipOf(req),
    });

    await sendMail({
      to: order.userId ? (await prisma.user.findUnique({ where: { id: order.userId } }))?.email ?? '' : '',
      template: 'ORDER_RECEIPT_UPLOADED',
      userId: order.userId,
      data: { orderNumber: order.orderNumber },
    });

    ok(res, { receiptId: receipt.id }, 'Receipt uploaded. Our finance team will verify your payment.');
  } catch (err) {
    next(err);
  }
}

/**
 * Stripe webhook endpoint. Receives the raw request body (express.raw) so the
 * signature can be verified before any business action is taken.
 */
export function stripeWebhookAdapter() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (typeof req.body !== 'string' && !Buffer.isBuffer(req.body)) {
        throw badRequest('Webhook expects a raw body');
      }
      const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
      const signature = req.headers['stripe-signature'] as string | undefined;
      if (!signature) throw badRequest('Missing stripe-signature header');
      await handleStripeWebhook(raw, signature);
      ok(res, null, 'Webhook processed');
    } catch (err) {
      next(err);
    }
  };
}
