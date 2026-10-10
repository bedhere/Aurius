import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { badRequest, ok, notFound } from '../lib/response';
import { getPriceForProduct, getVisiblePriceForProduct } from '../services/priceService';
import { AccountStatus, ProductStatus } from '@prisma/client';

function queryString(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw badRequest(`${name} must be provided once`);
  return value;
}

function categoriesForFilter(filter?: string): string[] | undefined {
  if (!filter || filter === 'all') return undefined;
  switch (filter) {
    case 'toilet':
      return ['Smart Toilet', 'Toilet Lid'];
    case 'water':
      return ['Whole-House Water Purification', 'Filter Cartridge', 'Shower Filtration'];
    case 'drain':
      return ['Engineering Custom Floor Drain'];
    default:
      return [filter];
  }
}

function waterCategoriesForSubcategory(filter?: string): string[] | undefined {
  if (filter === 'filter-core') return ['Filter Cartridge'];
  return undefined;
}

/**
 * Public catalogue: product info without any trade pricing. Price fields are
 * resolved per-requester and injected only when the caller has permission.
 */
export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = queryString(req.query.category, 'category');
    const series = queryString(req.query.series, 'series');
    const waterSubcategory = queryString(req.query.waterSubcategory, 'waterSubcategory');
    const search = queryString(req.query.search, 'search');
    const page = Math.max(1, parseInt(queryString(req.query.page, 'page') ?? '1', 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(queryString(req.query.pageSize, 'pageSize') ?? '24', 10) || 24));
    const selectedSeries = category === 'water' && (series === '瑞景' || series === '赛博')
      ? series
      : undefined;
    if (category === 'water' && selectedSeries && waterSubcategory === 'filter-core') {
      throw badRequest('Water series and filter-core filters cannot be combined');
    }
    const categories = category === 'water'
      ? waterCategoriesForSubcategory(waterSubcategory) ?? categoriesForFilter(category)
      : categoriesForFilter(category);

    const where = {
      status: ProductStatus.ACTIVE,
      ...(categories ? { category: { in: categories } } : {}),
      ...(selectedSeries ? { series: selectedSeries } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }, { model: { contains: search } }] } : {}),
    };
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          prices: true,
          variants: {
            where: { status: ProductStatus.ACTIVE },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // resolve caller's own price visibility (server-derived, level is never
    // chosen by the client)
    const caller = req.auth
      ? { accountStatus: req.auth.accountStatus ?? AccountStatus.PENDING_REVIEW, role: req.auth.role }
      : null;
    const visibleRole = caller?.accountStatus === AccountStatus.ACTIVE ? caller.role : null;

    const data = await Promise.all(
      products.map(async (p) => {
        const [price, prices] = await Promise.all([
          getPriceForProduct(p.id, caller),
          getVisiblePriceForProduct(p.id, visibleRole),
        ]);
        const parsedImages: string[] = (() => {
          try {
            return JSON.parse(p.images || '[]');
          } catch {
            return [];
          }
        })();
        return {
          id: p.id,
          productCode: p.productCode,
          sku: p.sku,
          name: p.name,
          category: p.category,
          model: p.model,
          description: p.description,
          images: parsedImages,
          displayStyle: p.displayStyle,
          series: p.series,
          giftable: (p as any).giftable ?? false,
          promotionNote: p.promotionNote,
          dimensionSpec: p.dimensionSpec,
          stock: p.stock,
          specs: p.specs ? (() => { try { return JSON.parse(p.specs); } catch { return null; } })() : null,
          variants: p.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            attributes: (() => { try { return JSON.parse(variant.attributes); } catch { return {}; } })(),
            stock: variant.stock,
          })),
          rrp: prices?.rrp ?? null,
          price: price.visible ? { value: price.price, currency: price.currency, level: price.level } : null,
          prices,
          priceNote: price.visible
            ? null
            : price.reason === 'NOT_LOGGED_IN'
              ? 'Contact Aurius to apply for trade access.'
              : 'Your application is under review.',
        };
      }),
    );

    ok(res, { items: data, total, page, pageSize });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const p = await prisma.product.findFirst({
      where: { id, status: ProductStatus.ACTIVE },
      include: {
        prices: true,
        variants: {
          where: { status: ProductStatus.ACTIVE },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!p) throw notFound('Product not found');
    const caller = req.auth
      ? { accountStatus: req.auth.accountStatus ?? AccountStatus.PENDING_REVIEW, role: req.auth.role }
      : null;
    const visibleRole = caller?.accountStatus === AccountStatus.ACTIVE ? caller.role : null;
    const [price, prices] = await Promise.all([
      getPriceForProduct(p.id, caller),
      getVisiblePriceForProduct(p.id, visibleRole),
    ]);
    ok(res, {
      id: p.id,
      productCode: p.productCode,
      sku: p.sku,
      name: p.name,
      category: p.category,
      model: p.model,
      description: p.description,
      images: (() => { try { return JSON.parse(p.images || '[]'); } catch { return []; } })(),
      displayStyle: p.displayStyle,
      series: p.series,
      giftable: (p as any).giftable ?? false,
      promotionNote: p.promotionNote,
      dimensionSpec: p.dimensionSpec,
      stock: p.stock,
      specs: p.specs ? (() => { try { return JSON.parse(p.specs); } catch { return null; } })() : null,
      variants: p.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        attributes: (() => { try { return JSON.parse(variant.attributes); } catch { return {}; } })(),
        stock: variant.stock,
      })),
      rrp: prices?.rrp ?? null,
      price: price.visible ? { value: price.price, currency: price.currency, level: price.level } : null,
      prices,
      priceNote: price.visible
        ? null
        : price.reason === 'NOT_LOGGED_IN'
          ? 'Contact Aurius to apply for trade access.'
          : 'Your application is under review.',
    });
  } catch (err) {
    next(err);
  }
}

export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groups = await prisma.product.groupBy({ by: ['category'], where: { status: ProductStatus.ACTIVE } });
    ok(res, ['toilet', 'water', 'drain', ...groups.map((g) => g.category)]);
  } catch (err) {
    next(err);
  }
}
