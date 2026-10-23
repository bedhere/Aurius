import nodemailer, { Transporter } from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { config, isProd } from '../config';
import { prisma } from '../lib/prisma';
import { templates, MailTemplateData } from '../mail/templates';
import { EmailStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// Unified mail service. SMTP config comes exclusively from .env.
// Without SMTP credentials the service runs in DEV mode: the email body is
// written under uploads/_devmail and the email log records DEV_LOGGED so the
// whole notification pipeline stays testable end-to-end.
// ---------------------------------------------------------------------------

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!config.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.password } : undefined,
    });
  }
  return transporter;
}

function ensureDevMailDir(): string {
  const dir = path.join(config.uploadPath, '_devmail');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export interface SendMailInput {
  to: string;
  template: string;
  data: MailTemplateData;
  userId?: number | null;
  replyTo?: string;
}

export async function sendMail(input: SendMailInput): Promise<boolean> {
  const tpl = templates[input.template];
  if (!tpl) {
    console.error(`[Mail] unknown template ${input.template}`);
    return false;
  }
  const { subject, text, html } = tpl(input.data);

  const record = await prisma.emailLog.create({
    data: {
      userId: input.userId ?? null,
      recipient: input.to,
      subject,
      template: input.template,
      status: 'QUEUED',
    },
  });

  const tp = getTransporter();
  if (!tp) {
    if (isProd()) {
      await prisma.emailLog.update({ where: { id: record.id }, data: { status: EmailStatus.FAILED, errorMessage: 'SMTP is not configured' } });
      return false;
    }
    // Dev mode: log email to disk
    try {
      const file = path.join(ensureDevMailDir(), `${Date.now()}-${input.template}.html`);
      fs.writeFileSync(file, html);
    } catch (err) {
      console.error('[Mail] dev write failed', err);
    }
    await prisma.emailLog.update({
      where: { id: record.id },
      data: { status: EmailStatus.DEV_LOGGED, sentAt: new Date() },
    });
    if (!isProd()) console.log(`[Mail:DEV] ${input.template} -> ${input.to}`);
    return true;
  }

  try {
    await tp.sendMail({ from: config.smtp.from, to: input.to, replyTo: input.replyTo, subject, text, html });
    await prisma.emailLog.update({
      where: { id: record.id },
      data: { status: EmailStatus.SENT, sentAt: new Date() },
    });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.emailLog.update({
      where: { id: record.id },
      data: { status: EmailStatus.FAILED, errorMessage: message },
    });
    console.error('[Mail] send failed', message);
    return false;
  }
}
