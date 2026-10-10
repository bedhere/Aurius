import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, badRequest, notFound } from '../lib/response';
import { CartStatus } from '@prisma/client';
import { getUnitPriceForLevel } from '../services/priceService';
import { roleToPriceLevel } from '../services/sequenceService';

async function getActiveCart(userId: number) {
  let cart = await prisma.shoppingCart.findFirst({
    where: { userId, status: CartStatus.ACTIVE },
    include: { items: { include: { product: { include: { prices: true } }, variant: true } } },
  });
  if (!cart) {
    cart = await prisma.shoppingCart.create({
      data: { userId },
      include: { items: { include: { product: { include: { prices: true } }, variant: true } } },
    });
  }
  return cart;
}

function availableStock(productStock: number, variantStock: number | null | undefined): number {
  return variantStock === null || variantStock === undefined ? productStock : Math.min(productStock, variantStock);
}

export async function getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cart = await getActiveCart(req.auth!.uid);
    const level = roleToPriceLevel(req.auth!.role) ?? 0;
    // prices recomputed server-side on every view — client prices are ignored
    let subtotal = 0;
    const items = [];
    for (const item of cart.items) {
      const unit = Math.round((await getUnitPriceForLevel(item.productId, level) + (item.variant?.priceAdjustment ?? 0)) * 100) / 100;
      const lineTotal = Math.round(unit * item.quantity * 100) / 100;
      subtotal += lineTotal;
      items.push({
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        sku: item.product.sku,
        image: (() => { try { return JSON.parse(item.product.images || '[]')[0]; } catch { return null; } })(),
        variantId: item.variantId,
        variantName: item.variantName,
        variantAttributes: item.variantAttributes ? (() => { try { return JSON.parse(item.variantAttributes); } catch { return {}; } })() : null,
        quantity: item.quantity,
        unitPrice: unit,
        lineTotal,
        stock: availableStock(item.product.stock, item.variant?.stock),
      });
    }
    ok(res, {
      id: cart.id,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      currency: 'AUD',
    });
  } catch (err) {
    next(err);
  }
}

export async function addToCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId, quantity, variantId } = req.body as { productId: number; quantity: number; variantId?: number };
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'ACTIVE') throw notFound('Product not available');
    const variant = variantId
      ? await prisma.productVariant.findFirst({ where: { id: variantId, productId, status: 'ACTIVE' } })
      : null;
    if (variantId && !variant) throw badRequest('Selected product option is unavailable');
    if (!variantId) {
      const hasVariants = await prisma.productVariant.count({ where: { productId, status: 'ACTIVE' } });
      if (hasVariants > 0) throw badRequest('Please select a product variant before adding to cart');
    }
    const stock = availableStock(product.stock, variant?.stock);
    if (stock < quantity) throw badRequest(`Insufficient stock (available: ${stock})`);

    const cart = await getActiveCart(req.auth!.uid);
    const existing = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId, variantId: variant?.id ?? null },
    });
    const newQty = (existing?.quantity ?? 0) + quantity;
    if (newQty > stock) throw badRequest(`Insufficient stock (available: ${stock})`);

    const level = roleToPriceLevel(req.auth!.role) ?? 0;
    const unit = Math.round((await getUnitPriceForLevel(productId, level) + (variant?.priceAdjustment ?? 0)) * 100) / 100;
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: newQty,
          unitPrice: unit,
          variantName: variant?.name ?? null,
          variantAttributes: variant?.attributes ?? null,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variant?.id ?? null,
          variantName: variant?.name ?? null,
          variantAttributes: variant?.attributes ?? null,
          quantity,
          unitPrice: unit,
        },
      });
    }
    ok(res, null, 'Added to cart');
  } catch (err) {
    next(err);
  }
}

export async function updateCartItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    const { quantity } = req.body as { quantity: number };
    const cart = await getActiveCart(req.auth!.uid);
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true, variant: true },
    });
    if (!item) throw notFound('Cart item not found');
    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
      ok(res, null, 'Item removed');
      return;
    }
    const stock = availableStock(item.product.stock, item.variant?.stock);
    if (quantity > stock) throw badRequest(`Insufficient stock (available: ${stock})`);
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    ok(res, null, 'Cart updated');
  } catch (err) {
    next(err);
  }
}

export async function removeCartItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    const cart = await getActiveCart(req.auth!.uid);
    const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw notFound('Cart item not found');
    await prisma.cartItem.delete({ where: { id: itemId } });
    ok(res, null, 'Item removed');
  } catch (err) {
    next(err);
  }
}

export async function clearCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cart = await getActiveCart(req.auth!.uid);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    ok(res, null, 'Cart cleared');
  } catch (err) {
    next(err);
  }
}
