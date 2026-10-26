import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { WebsiteEnquiry } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { badRequest, notFound, ok } from '../lib/response';
import { encryptField, safeDecrypt } from '../lib/crypto';
import { validated } from '../middleware/validate';
import { contactEnquirySchema, partnershipEnquirySchema, supportEnquirySchema } from '../validators/enquiry.schema';
import { sendMail } from '../services/mailService';
import { audit } from '../services/auditService';
import { z } from 'zod';

const ENQUIRY_SALT = 'website-enquiry';
interface Attachment { path: string; name: string; mime: string; }

async function saveAndNotify(kind: string, data: Record<string, string | string[]>, attachments: Attachment[] = []) {
  const name = String(data.name ?? data.contactName);
  const email = String(data.email);
  const category = kind === 'PARTNERSHIP' ? (data.interestedProducts as string[]).map((product) =>
    product.startsWith('Smart') ? 'Smart Bathroom' : product === 'Custom Floor Drains' ? 'Custom Floor Drains' : 'Water Filtration',
  ).filter((value, index, all) => all.indexOf(value) === index).join(', ') : String(data.enquiryType ?? 'Warranty & After-Sales');
  const reference = `AUR-${kind.slice(0, 3)}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const record = await prisma.websiteEnquiry.create({ data: {
    reference,
    kind, name, email, state: String(data.state ?? ''), category,
    data: encryptField(JSON.stringify(data), `${ENQUIRY_SALT}:${reference}`), attachments: JSON.stringify(attachments),
  } });
  const template = kind === 'CONTACT' ? 'CONTACT_ENQUIRY' : kind === 'PARTNERSHIP' ? 'PARTNERSHIP_ENQUIRY' : 'SUPPORT_ENQUIRY';
  const mailData = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value]));
  // Receipt is durable even if SMTP is unavailable. Delivery state remains visible
  // to staff, and the user is never asked to duplicate an already saved request.
  const delivery = await Promise.allSettled([
    sendMail({ to: 'info@aurius.com.au', replyTo: email, template, data: { ...mailData, reference: record.reference } }),
    sendMail({ to: email, template: 'ENQUIRY_CONFIRMATION', data: { name, reference: record.reference, kind } }),
  ]);
  return prisma.websiteEnquiry.update({ where: { id: record.id }, data: {
    notificationSent: delivery[0].status === 'fulfilled' && delivery[0].value,
    confirmationSent: delivery[1].status === 'fulfilled' && delivery[1].value,
  } }).catch(() => record);
}

export async function contactEnquiry(req: Request, res: Response, next: NextFunction) {
  try {
    const body = validated<z.infer<typeof contactEnquirySchema>>(req);
    const record = await saveAndNotify('CONTACT', body);
    ok(res, { reference: record.reference, confirmationSent: record.confirmationSent }, 'Your enquiry has been received. Our team will review your message and respond as soon as possible.');
  } catch (err) { next(err); }
}

export async function partnershipEnquiry(req: Request, res: Response, next: NextFunction) {
  try {
    const body = validated<z.infer<typeof partnershipEnquirySchema>>(req);
    const record = await saveAndNotify('PARTNERSHIP', body);
    ok(res, { reference: record.reference, confirmationSent: record.confirmationSent }, 'Your partnership enquiry has been received.');
  } catch (err) { next(err); }
}

export async function supportEnquiry(req: Request, res: Response, next: NextFunction) {
  const uploads = Object.values((req.files ?? {}) as Record<string, Express.Multer.File[]>).flat();
  let saved = false;
  try {
    const parsed = supportEnquirySchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues.map((issue) => issue.message).join('; '));
    const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
    if (!parsed.data.orderNumber && !files.proof?.length) throw badRequest('Provide an order number or proof of purchase');
    if (files.images?.some((file) => !file.mimetype.startsWith('image/'))) throw badRequest('Fault photos must be JPG or PNG images');
    const record = await saveAndNotify('SUPPORT', parsed.data, uploads.map((file) => ({ path: path.resolve(file.path), name: file.originalname, mime: file.mimetype })));
    saved = true;
    ok(res, { reference: record.reference, confirmationSent: record.confirmationSent }, 'Your support request has been received.');
  } catch (err) {
    if (!saved) uploads.forEach((file) => fs.rmSync(file.path, { force: true }));
    next(err);
  }
}

function adminRecord(record: WebsiteEnquiry) {
  const attachments = JSON.parse(record.attachments) as Attachment[];
  const { data, ...fields } = record;
  return { ...fields, data: JSON.parse(safeDecrypt(data, `${ENQUIRY_SALT}:${record.reference}`)), attachments: attachments.map((file, index) => ({ name: file.name, mime: file.mime, index })) };
}

export async function listEnquiries(req: Request, res: Response, next: NextFunction) {
  try {
    const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined;
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const records = await prisma.websiteEnquiry.findMany({ where: { kind, state, status, ...(category ? { category: { contains: category } } : {}) }, orderBy: { createdAt: 'desc' }, take: 200 });
    ok(res, records.map(adminRecord));
  } catch (err) { next(err); }
}

export async function reviewEnquiry(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = z.object({ status: z.enum(['NEW', 'IN_REVIEW', 'CONTACTED', 'CLOSED']), notes: z.string().trim().max(4000).default('') }).safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid review status or notes');
    await prisma.websiteEnquiry.update({ where: { id: Number(req.params.id) }, data: parsed.data });
    await audit({ userId: req.auth!.uid, action: 'SETTINGS_CHANGED', targetType: 'WebsiteEnquiry', targetId: req.params.id });
    ok(res, null, 'Review saved');
  } catch (err) { next(err); }
}

export async function enquiryAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await prisma.websiteEnquiry.findUnique({ where: { id: Number(req.params.id) } });
    if (!record) throw notFound('Request not found');
    const file = (JSON.parse(record.attachments) as Attachment[])[Number(req.params.index)];
    if (!file) throw notFound('Attachment not found');
    const root = path.resolve(config.uploadPath, 'support');
    const relative = path.relative(root, file.path);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(file.path)) throw notFound('Attachment not available');
    res.setHeader('Cache-Control', 'no-store');
    res.download(file.path, file.name);
  } catch (err) { next(err); }
}
