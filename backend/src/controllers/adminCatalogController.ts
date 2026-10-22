import { NextFunction, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { ok, badRequest, conflict, notFound, created } from '../lib/response';
import { audit } from '../services/auditService';
import { ProductStatus } from '@prisma/client';
import { sendProductLaunchPromotion } from '../services/reminderService';
import { productDiagramsSchema } from '../validators/product.schema';

function readProductDiagrams(body: unknown) {
  const result = productDiagramsSchema.safeParse(body);
  if (!result.success) throw badRequest(result.error.issues[0]?.message ?? 'Invalid product diagrams');
  return result.data;
}

function ipOf(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

// --- Products ---------------------------------------------------------------

export async function adminListProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) ?? '20', 10) || 20));
    const where = {
      ...(category ? { category } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }, { productCode: { contains: search } }] } : {}),
    };
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { prices: true },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    ok(res, {
      total,
      page,
      pageSize,
      items: products.map((p) => ({
        id: p.id,
        productCode: p.productCode,
        sku: p.sku,
        name: p.name,
        category: p.category,
        model: p.model,
        displayStyle: p.displayStyle,
        series: p.series,
        giftable: p.giftable,
        promotionNote: p.promotionNote,
        dimensionSpec: p.dimensionSpec,
        stock: p.stock,
        status: p.status,
        displayOrder: p.displayOrder,
        prices: p.prices
          ? {
              retail: p.prices.retailPrice,
              promo: p.prices.promoPrice,
              waterworker: p.prices.waterworkerPrice,
              builder: p.prices.builderPrice,
              distributor2: p.prices.distributor2Price,
              dealer1: p.prices.dealer1Price,
              level1: p.prices.level1Price,
              level2: p.prices.level2Price,
              level3: p.prices.level3Price,
              rrp: p.prices.rrp,
            }
          : null,
        images: (() => { try { return JSON.parse(p.images || '[]'); } catch { return []; } })(),
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function adminCreateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const diagrams = readProductDiagrams(req.body);
    const body = req.body as {
      productCode: string;
      sku: string;
      name: string;
      category: string;
      model?: string | null;
      description: string;
      images?: string[];
      stock?: number;
      status?: ProductStatus;
      specs?: Record<string, unknown> | null;
      displayStyle?: string | null;
      series?: string | null;
      promotionNote?: string | null;
      dimensionSpec?: string | null;
      giftable?: boolean;
      sendPromotion?: boolean;
      level1Price?: number;
      level2Price?: number;
      level3Price?: number;
      retailPrice?: number | null;
      promoPrice?: number | null;
      waterworkerPrice?: number | null;
      builderPrice?: number | null;
      distributor2Price?: number | null;
      dealer1Price?: number | null;
      rrp?: number | null;
    };
    const product = await prisma.$transaction(async (tx) => {
      const lastProduct = await tx.product.aggregate({ _max: { displayOrder: true } });
      const p = await tx.product.create({
        data: {
          productCode: body.productCode,
          sku: body.sku,
          name: body.name,
          category: body.category,
          model: body.model ?? null,
          description: body.description,
          images: JSON.stringify(body.images ?? []),
          ...diagrams,
          stock: body.stock ?? 0,
          status: body.status ?? ProductStatus.ACTIVE,
          specs: body.specs ? JSON.stringify(body.specs) : null,
          displayStyle: body.displayStyle ?? null,
          series: body.series ?? null,
          promotionNote: body.promotionNote ?? null,
          dimensionSpec: body.dimensionSpec ?? null,
          giftable: body.giftable ?? false,
          displayOrder: (lastProduct._max.displayOrder ?? -1) + 1,
        },
      });
      await tx.productPrice.create({
        data: {
          productId: p.id,
          retailPrice: body.retailPrice ?? body.rrp ?? null,
          promoPrice: body.promoPrice ?? null,
          waterworkerPrice: body.waterworkerPrice ?? null,
          builderPrice: body.builderPrice ?? null,
          distributor2Price: body.distributor2Price ?? null,
          dealer1Price: body.dealer1Price ?? null,
          level1Price: body.level1Price ?? 0,
          level2Price: body.level2Price ?? 0,
          level3Price: body.level3Price ?? 0,
          rrp: body.rrp ?? null,
        },
      });
      return p;
    });
    await audit({ userId: req.auth!.uid, action: 'SETTINGS_CHANGED', targetType: 'Product', targetId: String(product.id), details: { created: true }, ip: ipOf(req) });
    if (body.sendPromotion) {
      await sendProductLaunchPromotion({
        subject: `New AURIUS product: ${body.name}`,
        message: body.promotionNote ?? body.description,
        link: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/products/${product.id}`,
        productName: body.name,
      });
    }
    created(res, { id: product.id }, 'Product created');
  } catch (err) {
    next(err);
  }
}

export async function adminGetProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const product = await prisma.product.findUnique({ where: { id }, include: { prices: true } });
    if (!product) throw notFound('Product not found');
    ok(res, {
      id: product.id,
      productCode: product.productCode,
      sku: product.sku,
      name: product.name,
      category: product.category,
      model: product.model,
      description: product.description,
      stock: product.stock,
      status: product.status,
      displayOrder: product.displayOrder,
      displayStyle: product.displayStyle,
      series: product.series,
      promotionNote: product.promotionNote,
      dimensionSpec: product.dimensionSpec,
      dimensionImage: product.dimensionImage,
      remoteImage: product.remoteImage,
      featureImage: product.featureImage,
      giftable: product.giftable,
      specs: product.specs ? (() => { try { return JSON.parse(product.specs); } catch { return null; } })() : null,
      images: (() => { try { return JSON.parse(product.images || '[]'); } catch { return []; } })(),
      prices: product.prices
        ? {
            retail: product.prices.retailPrice,
            promo: product.prices.promoPrice,
            waterworker: product.prices.waterworkerPrice,
            builder: product.prices.builderPrice,
            distributor2: product.prices.distributor2Price,
            dealer1: product.prices.dealer1Price,
            level1: product.prices.level1Price,
            level2: product.prices.level2Price,
            level3: product.prices.level3Price,
            rrp: product.prices.rrp,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const diagrams = readProductDiagrams(req.body);
    const id = parseInt(req.params.id, 10);
    const body = req.body as Record<string, unknown> & { sendPromotion?: boolean };
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw notFound('Product not found');
    const data: Record<string, unknown> = { ...diagrams };
    for (const key of ['productCode', 'sku', 'name', 'category', 'model', 'description', 'stock', 'status'] as const) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.images !== undefined) data.images = JSON.stringify(body.images);
    if (body.specs !== undefined) data.specs = JSON.stringify(body.specs);
    if (body.displayStyle !== undefined) data.displayStyle = body.displayStyle;
    if (body.series !== undefined) data.series = body.series;
    if (body.promotionNote !== undefined) data.promotionNote = body.promotionNote;
    if (body.dimensionSpec !== undefined) data.dimensionSpec = body.dimensionSpec;
    if (body.giftable !== undefined) data.giftable = body.giftable;
    await prisma.product.update({ where: { id }, data });
    if (body.level1Price !== undefined || body.level2Price !== undefined || body.level3Price !== undefined || body.rrp !== undefined || body.retailPrice !== undefined || body.promoPrice !== undefined || body.waterworkerPrice !== undefined || body.builderPrice !== undefined || body.distributor2Price !== undefined || body.dealer1Price !== undefined) {
      await updatePriceLevels(id, body, req.auth!.uid, ipOf(req));
    }
    if (body.sendPromotion) {
      const updatedProduct = await prisma.product.findUnique({ where: { id } });
      if (updatedProduct) {
        await sendProductLaunchPromotion({
          subject: `New AURIUS product: ${updatedProduct.name}`,
          message: String(body.promotionNote ?? updatedProduct.promotionNote ?? updatedProduct.description),
          link: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/products/${updatedProduct.id}`,
          productName: updatedProduct.name,
        });
      }
    }
    await audit({ userId: req.auth!.uid, action: 'SETTINGS_CHANGED', targetType: 'Product', targetId: String(id), ip: ipOf(req) });
    ok(res, null, 'Product updated');
  } catch (err) {
    next(err);
  }
}

export async function adminReorderProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.body.id);
    const targetId = Number(req.body.targetId);
    if (!Number.isInteger(id) || !Number.isInteger(targetId) || id === targetId) {
      throw badRequest('Two different product IDs are required');
    }
    const products = await prisma.product.findMany({
      where: { id: { in: [id, targetId] } },
      select: { id: true, displayOrder: true },
    });
    if (products.length !== 2) throw notFound('Product not found');
    const current = products.find((product) => product.id === id)!;
    const target = products.find((product) => product.id === targetId)!;
    await prisma.$transaction([
      prisma.product.update({ where: { id }, data: { displayOrder: target.displayOrder } }),
      prisma.product.update({ where: { id: targetId }, data: { displayOrder: current.displayOrder } }),
    ]);
    await audit({ userId: req.auth!.uid, action: 'SETTINGS_CHANGED', targetType: 'Product', targetId: String(id), details: { reorderedWith: targetId }, ip: ipOf(req) });
    ok(res, null, 'Product order updated');
  } catch (err) {
    next(err);
  }
}

export async function adminArchiveProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw notFound('Product not found');
    await prisma.product.update({ where: { id }, data: { status: ProductStatus.ARCHIVED } });
    await audit({ userId: req.auth!.uid, action: 'SETTINGS_CHANGED', targetType: 'Product', targetId: String(id), details: { archived: true }, ip: ipOf(req) });
    ok(res, null, 'Product archived');
  } catch (err) {
    next(err);
  }
}

export async function adminPermanentlyDeleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw notFound('Product not found');
    if (product.status !== ProductStatus.ARCHIVED) throw badRequest('Archive the product before permanently deleting it');
    const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });
    if (orderItemCount > 0) throw conflict('Products with order history cannot be permanently deleted');

    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.installationRecord.updateMany({ where: { productId: id }, data: { productId: null } });
      await tx.priceChangeLog.deleteMany({ where: { productId: id } });
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.productPrice.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });
    await audit({ userId: req.auth!.uid, action: 'SETTINGS_CHANGED', targetType: 'Product', targetId: String(id), details: { permanentlyDeleted: true, productCode: product.productCode }, ip: ipOf(req) });
    ok(res, null, 'Product permanently deleted');
  } catch (err) {
    next(err);
  }
}

async function updatePriceLevels(productId: number, body: Record<string, unknown>, adminId: number, ip?: string): Promise<void> {
  const existing = await prisma.productPrice.findUnique({ where: { productId } });
  const updates: Record<string, number> = {};
  const fieldMap: Record<string, string> = { level1Price: 'level1Price', level2Price: 'level2Price', level3Price: 'level3Price' };
  const extraFieldMap: Record<string, string> = {
    retailPrice: 'retailPrice',
    promoPrice: 'promoPrice',
    waterworkerPrice: 'waterworkerPrice',
    builderPrice: 'builderPrice',
    distributor2Price: 'distributor2Price',
    dealer1Price: 'dealer1Price',
  };
  for (const [key, field] of Object.entries(fieldMap)) {
    if (body[key] !== undefined) updates[field] = Number(body[key]);
  }
  for (const [key, field] of Object.entries(extraFieldMap)) {
    if (body[key] !== undefined && body[key] !== null) updates[field] = Number(body[key]);
  }
  if (Object.keys(updates).length === 0 && body.rrp === undefined) return;

  if (existing) {
    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = (existing as unknown as Record<string, number>)[field];
      if (oldValue !== newValue) {
        await prisma.priceChangeLog.create({
          data: {
            productId,
            productPriceId: existing.id,
            field,
            oldValue,
            newValue,
            changedBy: adminId,
            reason: 'Admin price update',
          },
        });
      }
    }
      await prisma.productPrice.update({
      where: { productId },
      data: { ...updates, ...(body.rrp !== undefined ? { rrp: Number(body.rrp) } : {}) },
    });
  } else {
    await prisma.productPrice.create({
      data: {
        productId,
        retailPrice: body.retailPrice != null ? Number(body.retailPrice) : body.rrp != null ? Number(body.rrp) : null,
        promoPrice: body.promoPrice != null ? Number(body.promoPrice) : null,
        waterworkerPrice: body.waterworkerPrice != null ? Number(body.waterworkerPrice) : null,
        builderPrice: body.builderPrice != null ? Number(body.builderPrice) : null,
        distributor2Price: body.distributor2Price != null ? Number(body.distributor2Price) : null,
        dealer1Price: body.dealer1Price != null ? Number(body.dealer1Price) : null,
        level1Price: updates.level1Price ?? 0,
        level2Price: updates.level2Price ?? 0,
        level3Price: updates.level3Price ?? 0,
        rrp: body.rrp !== undefined ? Number(body.rrp) : null,
      },
    });
  }
  await audit({
    userId: adminId,
    action: 'PRICE_CHANGED',
    targetType: 'Product',
    targetId: String(productId),
    details: updates,
    ip,
  });
}

export async function uploadProductImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) throw badRequest('No file uploaded');
    const url = `/uploads/products/${path.basename(file.path)}`;
    ok(res, { url }, 'Image uploaded');
  } catch (err) {
    next(err);
  }
}

// --- Price rules (requirement 34) -------------------------------------------

export async function listPriceRules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rules = await prisma.regionalPriceRule.findMany({ orderBy: { createdAt: 'desc' } });
    ok(res, rules);
  } catch (err) {
    next(err);
  }
}

export async function createPriceRule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as {
      name: string;
      type: string;
      country?: string | null;
      state?: string | null;
      minQuantity?: number | null;
      maxQuantity?: number | null;
      percentValue: number;
      active?: boolean;
    };
    const rule = await prisma.regionalPriceRule.create({
      data: {
        name: body.name,
        type: body.type,
        country: body.country ?? null,
        state: body.state ?? null,
        minQuantity: body.minQuantity ?? null,
        maxQuantity: body.maxQuantity ?? null,
        percentValue: body.percentValue,
        active: body.active ?? true,
      },
    });
    await audit({ userId: req.auth!.uid, action: 'PRICE_CHANGED', targetType: 'PriceRule', targetId: String(rule.id), details: body, ip: ipOf(req) });
    created(res, rule, 'Price rule created');
  } catch (err) {
    next(err);
  }
}

export async function updatePriceRule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body as Record<string, unknown>;
    const rule = await prisma.regionalPriceRule.findUnique({ where: { id } });
    if (!rule) throw notFound('Rule not found');
    const updated = await prisma.regionalPriceRule.update({
      where: { id },
      data: {
        name: body.name as string,
        type: body.type as string,
        country: (body.country as string) ?? null,
        state: (body.state as string) ?? null,
        minQuantity: (body.minQuantity as number) ?? null,
        maxQuantity: (body.maxQuantity as number) ?? null,
        percentValue: body.percentValue as number,
        active: body.active as boolean,
      },
    });
    await audit({ userId: req.auth!.uid, action: 'PRICE_CHANGED', targetType: 'PriceRule', targetId: String(id), details: body, ip: ipOf(req) });
    ok(res, updated, 'Rule updated');
  } catch (err) {
    next(err);
  }
}

export async function deletePriceRule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.regionalPriceRule.update({ where: { id }, data: { active: false } });
    await audit({ userId: req.auth!.uid, action: 'PRICE_CHANGED', targetType: 'PriceRule', targetId: String(id), details: { deactivated: true }, ip: ipOf(req) });
    ok(res, null, 'Rule deactivated');
  } catch (err) {
    next(err);
  }
}

// --- Downloads management ----------------------------------------------------

export async function adminListDownloads(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = await prisma.downloadFile.findMany({
      orderBy: { createdAt: 'desc' },
      include: { accessLogs: { select: { id: true } } },
    });
    ok(res, files.map((f) => ({ ...f, downloadCount: f.accessLogs.length })));
  } catch (err) {
    next(err);
  }
}

export async function adminUploadDownload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) throw badRequest('No file uploaded');
    const body = req.body as {
      title: string;
      description?: string;
      category: string;
      allowedRoles: string; // "LEVEL1,LEVEL2"
      status?: string;
    };
    const record = await prisma.downloadFile.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        category: body.category as never,
        filePath: file.path,
        originalName: file.originalname,
        mime: file.mimetype,
        size: file.size,
        allowedRoles: body.allowedRoles,
        status: (body.status as never) ?? 'PUBLISHED',
      },
    });
    await audit({ userId: req.auth!.uid, action: 'FILE_UPLOADED', targetType: 'DownloadFile', targetId: String(record.id), ip: ipOf(req) });
    created(res, record, 'File uploaded');
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateDownload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body as { title?: string; description?: string | null; category?: string; allowedRoles?: string; status?: string };
    const record = await prisma.downloadFile.findUnique({ where: { id } });
    if (!record) throw notFound('File not found');
    const updated = await prisma.downloadFile.update({
      where: { id },
      data: {
        title: body.title ?? record.title,
        description: body.description !== undefined ? body.description : record.description,
        category: (body.category as never) ?? record.category,
        allowedRoles: body.allowedRoles ?? record.allowedRoles,
        status: (body.status as never) ?? record.status,
      },
    });
    await audit({ userId: req.auth!.uid, action: 'SETTINGS_CHANGED', targetType: 'DownloadFile', targetId: String(id), ip: ipOf(req) });
    ok(res, updated, 'File updated');
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteDownload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const record = await prisma.downloadFile.findUnique({ where: { id } });
    if (!record) throw notFound('File not found');
    await prisma.downloadFile.update({ where: { id }, data: { status: 'ARCHIVED' } });
    if (fs.existsSync(record.filePath)) {
      // keep physical file for audit; only metadata is archived
    }
    await audit({ userId: req.auth!.uid, action: 'SETTINGS_CHANGED', targetType: 'DownloadFile', targetId: String(id), details: { archived: true }, ip: ipOf(req) });
    ok(res, null, 'File archived');
  } catch (err) {
    next(err);
  }
}
