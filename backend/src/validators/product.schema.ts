import { z } from 'zod';

export const productSchema = z.object({
  productCode: z.string().min(1).max(50),
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  model: z.string().max(100).optional().nullable(),
  description: z.string().min(1).max(10000),
  images: z.array(z.string()).default([]),
  stock: z.number().int().min(0).default(0),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('ACTIVE'),
  specs: z.record(z.unknown()).optional().nullable(),
});

export const productPriceSchema = z.object({
  level1Price: z.number().positive(),
  level2Price: z.number().positive(),
  level3Price: z.number().positive(),
  rrp: z.number().positive().optional().nullable(),
});

export const priceRuleSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['REGIONAL_DISCOUNT', 'VOLUME_DISCOUNT', 'REMOTE_AREA_SURCHARGE']),
  country: z.string().max(100).optional().nullable(),
  state: z.string().max(10).optional().nullable(),
  minQuantity: z.number().int().min(1).optional().nullable(),
  maxQuantity: z.number().int().min(1).optional().nullable(),
  percentValue: z.number().min(-100).max(100),
  active: z.boolean().default(true),
});

export const downloadFileSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  category: z.enum([
    'WATERMARK_CERTIFICATION',
    'PRODUCT_CATALOGUE',
    'INSTALLATION_DRAWINGS',
    'INSTALLATION_GUIDE',
    'DEALER_CONTRACT_TEMPLATE',
    'TECHNICAL_DOCUMENTS',
    'OTHER',
  ]),
  allowedRoles: z.array(z.enum(['LEVEL1', 'LEVEL2', 'LEVEL3'])).min(1),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
});
