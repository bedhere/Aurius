import { z } from 'zod';

export const addToCartSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(999),
  variantId: z.number().int().positive().optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(999),
});

export const checkoutSchema = z.object({
  cartId: z.number().int().positive(),
  shippingName: z.string().min(1).max(200),
  shippingPhone: z.string().min(6).max(20),
  shippingStreet: z.string().min(1).max(200),
  shippingSuburb: z.string().min(1).max(100),
  shippingState: z.string().min(2).max(10),
  shippingPostcode: z.string().min(4).max(10),
  shippingCountry: z.string().max(100).optional(),
  shippingMethod: z.string().min(1).max(30),
  notes: z.string().max(2000).optional().nullable(),
  referralTechId: z.string().max(50).optional().nullable(),
  referralEmail: z.string().email().optional().nullable(),
});

export const guestCheckoutSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(999),
  variantId: z.number().int().positive().optional().nullable(),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(6).max(20).optional().nullable(),
  shippingName: z.string().min(1).max(200),
  shippingPhone: z.string().min(6).max(20),
  shippingStreet: z.string().min(1).max(200),
  shippingSuburb: z.string().min(1).max(100),
  shippingState: z.string().min(2).max(10),
  shippingPostcode: z.string().min(4).max(10),
  shippingCountry: z.string().max(100).optional(),
  shippingMethod: z.string().min(1).max(30),
  notes: z.string().max(2000).optional().nullable(),
});

export const choosePaymentSchema = z.object({
  method: z.enum(['PAYPAL', 'CREDIT_CARD', 'BANK_TRANSFER', 'SANDBOX']),
});

export const addressSchema = z.object({
  label: z.string().max(50).optional(),
  contactName: z.string().min(1).max(200),
  phone: z.string().min(6).max(20),
  street: z.string().min(1).max(200),
  suburb: z.string().min(1).max(100),
  state: z.string().min(2).max(10),
  postcode: z.string().min(4).max(10),
  country: z.string().max(100).optional(),
});

export const installationSchema = z.object({
  technicianAurId: z.string().max(50).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  productId: z.number().int().positive().optional().nullable(),
  productName: z.string().min(1).max(200),
  serialNumber: z.string().max(100).optional().nullable(),
  installationDate: z.string().datetime().optional().nullable(),
  installationAddress: z.string().max(500).optional().nullable(),
});
