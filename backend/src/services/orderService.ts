import { prisma } from '../lib/prisma';
import { generateOrderNumber, roleToPriceLevel } from './sequenceService';
import { getUnitPriceForLevel } from './priceService';
import { audit } from './auditService';
import { sendMail } from './mailService';
import { randomUUID } from 'node:crypto';
import {
  AccountStatus,
  CartStatus,
  OrderStatus,
  PaymentStatus,
  ShipmentStatus,
  User,
} from '@prisma/client';
import { badRequest, forbidden } from '../lib/response';

// ---------------------------------------------------------------------------
// Order creation (requirements 35, 36, 40).
// The browser NEVER supplies prices. The backend:
//  1. re-queries every cart item's product, stock and the caller's price level
//  2. applies regional/volume price rules
//  3. recomputes subtotal → discount → shipping → total
//  4. locks stock, creates the order + status history and converts the cart
// ---------------------------------------------------------------------------

export interface CheckoutInput {
  cartId: number;
  shippingName: string;
  shippingPhone: string;
  shippingStreet: string;
  shippingSuburb: string;
  shippingState: string;
  shippingPostcode: string;
  shippingCountry?: string;
  shippingMethod: string; // STANDARD / EXPRESS / PICKUP
  notes?: string;
  referralTechId?: string;
  referralEmail?: string;
}

export interface GuestCheckoutInput {
  productId: number;
  quantity: number;
  variantId?: number | null;
  guestEmail: string;
  guestPhone?: string | null;
  shippingName: string;
  shippingPhone: string;
  shippingStreet: string;
  shippingSuburb: string;
  shippingState: string;
  shippingPostcode: string;
  shippingCountry?: string;
  shippingMethod: string;
  notes?: string | null;
}

export interface ShippingMethodDef {
  id: string;
  name: string;
  fee: number;
}

export async function getShippingMethods(): Promise<ShippingMethodDef[]> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'SHIPPING_METHODS' } });
  if (setting) {
    try {
      return JSON.parse(setting.value) as ShippingMethodDef[];
    } catch {
      /* fall through to defaults */
    }
  }
  return [
    { id: 'STANDARD', name: 'Standard Delivery', fee: 29 },
    { id: 'EXPRESS', name: 'Express Delivery', fee: 59 },
    { id: 'PICKUP', name: 'Warehouse Pickup', fee: 0 },
  ];
}

export function shippingFee(methods: ShippingMethodDef[], methodId: string): number {
  const m = methods.find((x) => x.id === methodId);
  return m ? m.fee : 0;
}

export function isEngineeringProduct(product: { category: string; displayStyle?: string | null }): boolean {
  return product.category.toLowerCase().includes('drain') || product.displayStyle === 'engineering';
}

async function getGuestUnitPrice(productId: number): Promise<number> {
  const priceRow = await prisma.productPrice.findUnique({ where: { productId } });
  if (!priceRow) throw badRequest('No price configured for product');
  const price = priceRow.promoPrice ?? priceRow.retailPrice ?? priceRow.level1Price;
  return Math.round(price * 100) / 100;
}

async function applyPriceRules(
  level: number,
  basePrice: number,
  quantity: number,
  state: string,
): Promise<number> {
  // Rules are additive: regional discount, volume discount, remote surcharge.
  let unit = basePrice;
  const rules = await prisma.regionalPriceRule.findMany({ where: { active: true } });
  for (const rule of rules) {
    const stateMatch = !rule.state || rule.state === state;
    const qtyMatch =
      (rule.minQuantity === null || quantity >= rule.minQuantity) &&
      (rule.maxQuantity === null || quantity <= rule.maxQuantity);
    if (!stateMatch || !qtyMatch) continue;
    if (rule.type === 'REGIONAL_DISCOUNT' || rule.type === 'VOLUME_DISCOUNT') {
      unit = unit * (1 + rule.percentValue / 100);
    } else if (rule.type === 'REMOTE_AREA_SURCHARGE') {
      unit = unit * (1 + rule.percentValue / 100);
    }
  }
  return Math.round(unit * 100) / 100;
}

export async function createOrderFromCart(user: User, input: CheckoutInput, ip?: string): Promise<{ orderId: number; orderNumber: string; total: number }> {
  // Permission gate: only ACTIVE members may order
  if (user.accountStatus !== AccountStatus.ACTIVE) {
    throw forbidden('Your application is under review. Ordering is not available yet.');
  }
  const level = roleToPriceLevel(user.role);
  if (!level) throw forbidden('Your role does not have ordering permission');

  const cart = await prisma.shoppingCart.findFirst({
    where: { id: input.cartId, userId: user.id, status: CartStatus.ACTIVE },
    include: { items: { include: { product: { include: { prices: true } }, variant: true } } },
  });
  if (!cart || cart.items.length === 0) throw badRequest('Cart is empty');

  const memberId = await prisma.memberId.findUnique({ where: { userId: user.id } });
  if (!memberId) throw forbidden('Member ID not found — account not fully activated');

  // Server-side price + stock validation for every line
  let subtotal = 0;
  const lines: {
    productId: number;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    productName: string;
    sku: string;
    variantId: number | null;
    variantName: string | null;
    variantAttributes: string | null;
  }[] = [];

  for (const item of cart.items) {
    if (item.product.status !== 'ACTIVE') {
      throw badRequest(`Product "${item.product.name}" is not available`);
    }
    if (item.quantity < 1) throw badRequest('Quantity must be at least 1');
    if (item.product.stock < item.quantity) {
      throw badRequest(`Insufficient stock for "${item.product.name}" (available: ${item.product.stock})`);
    }
    if (item.variant?.stock !== null && item.variant?.stock !== undefined && item.variant.stock < item.quantity) {
      throw badRequest(`Insufficient stock for "${item.variant.name}" (available: ${item.variant.stock})`);
    }
    const baseUnit = await getUnitPriceForLevel(item.productId, level) + (item.variant?.priceAdjustment ?? 0);
    const unit = await applyPriceRules(level, baseUnit, item.quantity, input.shippingState);
    const lineTotal = Math.round(unit * item.quantity * 100) / 100;
    subtotal += lineTotal;
    lines.push({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: unit,
      lineTotal,
      productName: item.product.name,
      sku: item.product.sku,
      variantId: item.variantId,
      variantName: item.variantName,
      variantAttributes: item.variantAttributes,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const methods = await getShippingMethods();
  const shipFee = shippingFee(methods, input.shippingMethod);
  const discount = 0; // reserved for promo/campaign rules; adjustments must be audited
  const total = Math.round((subtotal - discount + shipFee) * 100) / 100;
  const orderNumber = await generateOrderNumber();

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: user.id,
        memberAurId: memberId.aurId,
        priceLevel: level,
        status: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.UNPAID,
        shipmentStatus: ShipmentStatus.PENDING,
        subtotal,
        discount,
        shippingFee: shipFee,
        total,
        shippingName: input.shippingName,
        shippingPhone: input.shippingPhone,
        shippingStreet: input.shippingStreet,
        shippingSuburb: input.shippingSuburb,
        shippingState: input.shippingState,
        shippingPostcode: input.shippingPostcode,
        shippingCountry: input.shippingCountry ?? 'Australia',
        shippingMethod: input.shippingMethod,
        notes: input.notes,
        referralTechId: input.referralTechId || null,
        referralEmail: input.referralEmail || null,
      },
    });

    for (const line of lines) {
      await tx.orderItem.create({
        data: {
          orderId: created.id,
          productId: line.productId,
          productName: line.productName,
          sku: line.sku,
          variantId: line.variantId,
          variantName: line.variantName,
          variantAttributes: line.variantAttributes,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
        },
      });
      // stock lock at order time
      await tx.product.update({
        where: { id: line.productId },
        data: { stock: { decrement: line.quantity } },
      });
      if (line.variantId) {
        await tx.productVariant.update({
          where: { id: line.variantId },
          data: { stock: { decrement: line.quantity } },
        });
      }
    }

    await tx.orderStatusHistory.create({
      data: { orderId: created.id, fromStatus: null, toStatus: OrderStatus.PENDING_PAYMENT, note: 'Order created', changedBy: user.id, ip },
    });

    await tx.shoppingCart.update({ where: { id: cart.id }, data: { status: CartStatus.CONVERTED } });

    return created;
  });

  await audit({
    userId: user.id,
    action: 'ORDER_CREATED',
    targetType: 'Order',
    targetId: orderNumber,
    details: { total, priceLevel: level, method: input.shippingMethod },
    ip,
  });

  const shippingAddress = `${input.shippingStreet}, ${input.shippingSuburb}, ${input.shippingState} ${input.shippingPostcode}`;
  await sendMail({
    to: user.email,
    template: 'ORDER_SUBMITTED',
    userId: user.id,
    data: {
      orderNumber,
      memberId: memberId.aurId,
      total,
      paymentMethod: 'Pending',
      orderTime: new Date().toISOString(),
      shippingAddress,
    },
  });
  // Notify operations mailbox as well
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@aurius.com.au';
  await sendMail({
    to: adminEmail,
    template: 'ORDER_SUBMITTED',
    data: {
      orderNumber,
      memberId: memberId.aurId,
      total,
      paymentMethod: 'Pending',
      orderTime: new Date().toISOString(),
      shippingAddress,
    },
  });

  return { orderId: order.id, orderNumber, total };
}

export async function createGuestOrder(
  input: GuestCheckoutInput,
  ip?: string,
): Promise<{ orderId: number; orderNumber: string; total: number; guestToken: string }> {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, status: 'ACTIVE' },
    include: { variants: { where: { status: 'ACTIVE' } }, prices: true },
  });
  if (!product) throw badRequest('Product not available');
  if (isEngineeringProduct(product)) {
    throw badRequest('Engineering floor drains require a custom project enquiry');
  }
  if (input.quantity < 1) throw badRequest('Quantity must be at least 1');

  const variant = input.variantId
    ? product.variants.find((v) => v.id === input.variantId) ?? null
    : null;
  if (input.variantId && !variant) throw badRequest('Selected product option is unavailable');
  if (product.stock < input.quantity) throw badRequest(`Insufficient stock for "${product.name}" (available: ${product.stock})`);
  if (variant?.stock !== null && variant?.stock !== undefined && variant.stock < input.quantity) {
    throw badRequest(`Insufficient stock for "${variant.name}" (available: ${variant.stock})`);
  }

  const baseUnit = await getGuestUnitPrice(product.id) + (variant?.priceAdjustment ?? 0);
  const unit = await applyPriceRules(0, baseUnit, input.quantity, input.shippingState);
  const lineTotal = Math.round(unit * input.quantity * 100) / 100;
  const methods = await getShippingMethods();
  const shipFee = shippingFee(methods, input.shippingMethod);
  const total = Math.round((lineTotal + shipFee) * 100) / 100;
  const orderNumber = await generateOrderNumber();
  const guestToken = randomUUID();

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        guestToken,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone ?? input.shippingPhone,
        userId: null,
        memberAurId: null,
        priceLevel: 0,
        status: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.UNPAID,
        shipmentStatus: ShipmentStatus.PENDING,
        subtotal: lineTotal,
        discount: 0,
        shippingFee: shipFee,
        total,
        shippingName: input.shippingName,
        shippingPhone: input.shippingPhone,
        shippingStreet: input.shippingStreet,
        shippingSuburb: input.shippingSuburb,
        shippingState: input.shippingState,
        shippingPostcode: input.shippingPostcode,
        shippingCountry: input.shippingCountry ?? 'Australia',
        shippingMethod: input.shippingMethod,
        notes: input.notes,
      },
    });

    await tx.orderItem.create({
      data: {
        orderId: created.id,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        variantId: variant?.id ?? null,
        variantName: variant?.name ?? null,
        variantAttributes: variant?.attributes ?? null,
        quantity: input.quantity,
        unitPrice: unit,
        lineTotal,
      },
    });

    await tx.product.update({ where: { id: product.id }, data: { stock: { decrement: input.quantity } } });
    if (variant) {
      await tx.productVariant.update({ where: { id: variant.id }, data: { stock: { decrement: input.quantity } } });
    }

    await tx.orderStatusHistory.create({
      data: { orderId: created.id, fromStatus: null, toStatus: OrderStatus.PENDING_PAYMENT, note: 'Guest order created', changedBy: null, ip },
    });

    return created;
  });

  await audit({
    userId: null,
    action: 'ORDER_CREATED',
    targetType: 'Order',
    targetId: orderNumber,
    details: { total, guest: true, method: input.shippingMethod },
    ip,
  });

  await sendMail({
    to: input.guestEmail,
    template: 'ORDER_SUBMITTED',
    data: {
      orderNumber,
      memberId: 'Guest',
      total,
      paymentMethod: 'Pending',
      orderTime: new Date().toISOString(),
      shippingAddress: `${input.shippingStreet}, ${input.shippingSuburb}, ${input.shippingState} ${input.shippingPostcode}`,
    },
  });

  return { orderId: order.id, orderNumber, total, guestToken };
}

export async function setOrderStatus(
  orderId: number,
  toStatus: OrderStatus,
  note: string,
  changedBy: number | null,
  ip?: string,
): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw badRequest('Order not found');
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: toStatus } });
    await tx.orderStatusHistory.create({
      data: { orderId, fromStatus: order.status, toStatus, note, changedBy, ip },
    });
  });
  await audit({
    userId: changedBy,
    action: 'ORDER_STATUS_CHANGED',
    targetType: 'Order',
    targetId: order.orderNumber,
    details: { from: order.status, to: toStatus, note },
    ip,
  });
}

export async function cancelOrder(orderId: number, userId: number, ip?: string): Promise<void> {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw badRequest('Order not found');
  if (!['PENDING_PAYMENT', 'PAYMENT_PROCESSING'].includes(order.status)) {
    throw badRequest('Only unpaid orders can be cancelled');
  }
  await prisma.$transaction(async (tx) => {
    // restock
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const it of items) {
      await tx.product.update({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } });
      if (it.variantId) {
        await tx.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } });
      }
    }
    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED, paymentStatus: PaymentStatus.CLOSED, cancelledAt: new Date() },
    });
    await tx.orderStatusHistory.create({
      data: { orderId, fromStatus: order.status, toStatus: OrderStatus.CANCELLED, note: 'Cancelled by member', changedBy: userId, ip },
    });
  });
  await audit({
    userId,
    action: 'ORDER_STATUS_CHANGED',
    targetType: 'Order',
    targetId: order.orderNumber,
    details: { to: 'CANCELLED' },
    ip,
  });
}
