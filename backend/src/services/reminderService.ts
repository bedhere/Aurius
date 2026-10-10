import { prisma } from '../lib/prisma';
import { sendMail } from './mailService';
import { PaymentStatus } from '@prisma/client';

const PARTNER_ROLES = ['ADMIN', 'REGIONAL_AGENT', 'LICENSED_TRADESMAN', 'SUB_DEALER', 'WATERWORKER', 'BUILDER'] as const;

function monthsAgo(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

export async function runAnnualPurchaseReminders(now = new Date()): Promise<{ scanned: number; sent: number }> {
  const cutoff = monthsAgo(now, 12);
  const reminderCutoff = monthsAgo(now, 12);
  const orders = await prisma.order.findMany({
    where: {
      paymentStatus: PaymentStatus.PAID,
      paidAt: { lte: cutoff },
      OR: [{ lastReminderSentAt: null }, { lastReminderSentAt: { lte: reminderCutoff } }],
      AND: [
        {
          OR: [
            { userId: null, guestEmail: { not: null } },
            { user: { role: { notIn: [...PARTNER_ROLES] } } },
          ],
        },
      ],
    },
    include: { items: true, user: { select: { email: true, role: true } } },
    orderBy: { paidAt: 'asc' },
  });

  let sent = 0;
  for (const order of orders) {
    const firstItem = order.items[0];
    const recipient = order.user?.email ?? order.guestEmail;
    if (!recipient) continue;
    await sendMail({
      to: recipient,
      template: 'ANNUAL_REMINDER',
      data: {
        orderNumber: order.orderNumber,
        firstName: order.shippingName.split(' ')[0],
        productName: firstItem?.productName,
      },
    });
    await prisma.order.update({ where: { id: order.id }, data: { lastReminderSentAt: now } });
    sent += 1;
  }

  return { scanned: orders.length, sent };
}

export async function sendProductLaunchPromotion(input: {
  subject: string;
  message: string;
  link?: string;
  recipientEmails?: string[];
  productName?: string;
}): Promise<{ sent: number }> {
  const recipients = input.recipientEmails?.length
    ? input.recipientEmails
    : Array.from(new Set(
        (await prisma.order.findMany({
          where: {
            paymentStatus: 'PAID',
            OR: [
              { userId: null, guestEmail: { not: null } },
              { user: { role: { notIn: [...PARTNER_ROLES] } } },
            ],
          },
          include: { user: { select: { email: true } } },
        }))
          .map((order) => order.user?.email ?? order.guestEmail)
          .filter((email): email is string => Boolean(email)),
      ));

  let sent = 0;
  for (const email of recipients) {
    await sendMail({
      to: email,
      template: 'NEW_PRODUCT_PROMOTION',
      data: {
        subject: input.subject,
        message: input.message,
        link: input.link,
        productName: input.productName,
      },
    });
    sent += 1;
  }
  return { sent };
}
