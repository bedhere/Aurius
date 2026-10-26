import { NextFunction, Request, Response } from 'express';
import { SupportResource } from '@prisma/client';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { badRequest, notFound, ok } from '../lib/response';
import { audit } from '../services/auditService';

export const resourceCategories = ['PRODUCT_MANUAL', 'INSTALLATION_GUIDE', 'TECHNICAL_SPECIFICATION', 'MAINTENANCE_GUIDE', 'WATERMARK_CERTIFICATE', 'INSTALLATION_VIDEO', 'WARRANTY_TERMS'] as const;
const resourceSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.enum(resourceCategories),
  description: z.string().trim().max(4000).default(''),
  productId: z.preprocess((value) => value === '' || value === null || value === undefined ? null : Number(value), z.number().int().positive().nullable()),
  certificateNumber: z.string().trim().max(200).default(''),
  certificationScope: z.string().trim().max(2000).default(''),
  published: z.preprocess((value) => value === true || value === 'true', z.boolean()),
});

function resourcePath(filePath: string): string {
  const root = path.resolve(config.uploadPath, 'resources');
  const absolute = path.resolve(filePath);
  const relative = path.relative(root, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw badRequest('Invalid resource file path');
  return absolute;
}

function metadata(resource: SupportResource) {
  const { filePath, ...data } = resource;
  return { ...data, hasFile: Boolean(filePath), fileUrl: `/api/support/resources/${resource.id}/file` };
}

async function checkPublication(resource: z.infer<typeof resourceSchema>, hasFile: boolean, mime: string | null) {
  if (resource.productId && !await prisma.product.findFirst({ where: { id: resource.productId, status: 'ACTIVE' } })) {
    throw badRequest('Choose an active product model');
  }
  if (!resource.published) return;
  if (!hasFile) throw badRequest('Upload the real file before publishing');
  if (resource.category !== 'WARRANTY_TERMS' && !resource.productId) throw badRequest('Select the product model before publishing');
  if (resource.category === 'WATERMARK_CERTIFICATE' && (!resource.certificateNumber || !resource.certificationScope)) {
    throw badRequest('Enter the verified certificate number and certification scope before publishing');
  }
  if (resource.category === 'INSTALLATION_VIDEO' ? !mime?.startsWith('video/') : mime?.startsWith('video/')) {
    throw badRequest('Choose a file that matches the resource category');
  }
}

export async function listPublicResources(req: Request, res: Response, next: NextFunction) {
  try {
    const resources = await prisma.supportResource.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' } });
    const products = await prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, model: true } });
    const visible = resources.filter((resource) => resource.filePath && fs.existsSync(resourcePath(resource.filePath)) &&
      (!resource.productId || products.some((product) => product.id === resource.productId)) &&
      (resource.category === 'WARRANTY_TERMS' || resource.productId !== null) &&
      (!req.query.productId || resource.productId === Number(req.query.productId) || resource.productId === null));
    ok(res, visible.map((resource) => ({ ...metadata(resource), product: products.find((product) => product.id === resource.productId) ?? null })));
  } catch (err) { next(err); }
}

export async function publicResourceFile(req: Request, res: Response, next: NextFunction) {
  try {
    const resource = await prisma.supportResource.findFirst({ where: { id: Number(req.params.id), published: true } });
    if (!resource?.filePath) throw notFound('Resource not available');
    if (resource.category !== 'WARRANTY_TERMS' && !resource.productId) throw notFound('Resource not available');
    if (resource.productId && !await prisma.product.findFirst({ where: { id: resource.productId, status: 'ACTIVE' } })) throw notFound('Resource not available');
    const absolute = resourcePath(resource.filePath);
    if (!fs.existsSync(absolute)) throw notFound('Resource file unavailable');
    // No public static directory: archiving immediately removes file access.
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(absolute);
  } catch (err) { next(err); }
}

export async function listAdminResources(_req: Request, res: Response, next: NextFunction) {
  try {
    const [resources, products] = await Promise.all([
      prisma.supportResource.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, model: true }, orderBy: { name: 'asc' } }),
    ]);
    ok(res, { resources: resources.map(metadata), products });
  } catch (err) { next(err); }
}

export async function saveResource(req: Request, res: Response, next: NextFunction) {
  let saved = false;
  try {
    const existing = req.params.id ? await prisma.supportResource.findUnique({ where: { id: Number(req.params.id) } }) : null;
    if (req.params.id && !existing) throw notFound('Resource not found');
    const parsed = resourceSchema.safeParse({ ...existing, ...req.body });
    if (!parsed.success) throw badRequest(parsed.error.issues.map((issue) => issue.message).join('; '));
    const fields = parsed.data;
    const mime = req.file?.mimetype ?? existing?.mime ?? null;
    await checkPublication(fields, Boolean(req.file || (existing?.filePath && fs.existsSync(resourcePath(existing.filePath)))), mime);
    const data = {
      ...fields,
      ...(req.file ? { filePath: path.resolve(req.file.path), originalName: req.file.originalname, mime: req.file.mimetype, size: req.file.size } : {}),
    };
    const resource = existing
      ? await prisma.supportResource.update({ where: { id: existing.id }, data })
      : await prisma.supportResource.create({ data });
    saved = true;
    if (req.file && existing?.filePath) fs.rmSync(resourcePath(existing.filePath), { force: true });
    await audit({ userId: req.auth!.uid, action: 'SETTINGS_CHANGED', targetType: 'SupportResource', targetId: String(resource.id) });
    ok(res, metadata(resource), 'Resource saved');
  } catch (err) {
    if (!saved && req.file) fs.rmSync(req.file.path, { force: true });
    next(err);
  }
}

export async function setResourcePublication(req: Request, res: Response, next: NextFunction) {
  try {
    const resource = await prisma.supportResource.findUnique({ where: { id: Number(req.params.id) } });
    if (!resource) throw notFound('Resource not found');
    if (typeof req.body.published !== 'boolean') throw badRequest('Specify publication status');
    const parsed = resourceSchema.parse({ ...resource, published: req.body.published });
    await checkPublication(parsed, Boolean(resource.filePath && fs.existsSync(resourcePath(resource.filePath))), resource.mime);
    await prisma.supportResource.update({ where: { id: resource.id }, data: { published: parsed.published } });
    await audit({ userId: req.auth!.uid, action: 'SETTINGS_CHANGED', targetType: 'SupportResource', targetId: String(resource.id) });
    ok(res, null, 'Publication status updated');
  } catch (err) { next(err); }
}
