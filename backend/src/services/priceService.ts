import { prisma } from '../lib/prisma';
import { AccountStatus, UserRole } from '@prisma/client';
import { roleToPriceLevel } from './sequenceService';
import { logSecurityEvent, checkPriceBurst } from './securityService';
import { config } from '../config';

// ---------------------------------------------------------------------------
// Price access control. Public retail/promotion prices may be shown together;
// partner pricing is limited to the one tier derived from the verified role.
// ---------------------------------------------------------------------------

export interface PriceResult {
  visible: boolean;
  reason: 'NOT_LOGGED_IN' | 'UNDER_REVIEW' | 'NO_PERMISSION' | 'OK';
  price?: number;
  currency?: string;
  level?: number;
}

export type VisiblePriceKey =
  | 'retailPrice'
  | 'promoPrice'
  | 'waterworkerPrice'
  | 'builderPrice'
  | 'distributor2Price'
  | 'dealer1Price'
  | 'level1Price'
  | 'level2Price'
  | 'level3Price';

export interface VisibleProductPrices {
  retail: number | null;
  promo: number | null;
  member: number | null;
  memberLabel: string;
  memberLevel: number;
  currency: string;
  rrp: number | null;
}

export function visiblePriceKeyForRole(role: UserRole | null | undefined): VisiblePriceKey {
  if (config.tradePricingMode === 'uniform' && role && roleToPriceLevel(role)) return 'level2Price';
  switch (role) {
    case 'REGIONAL_AGENT':
      return 'dealer1Price';
    case 'LICENSED_TRADESMAN':
      return 'level2Price';
    case 'SUB_DEALER':
      return 'level3Price';
    case 'WATERWORKER':
      return 'waterworkerPrice';
    case 'BUILDER':
      return 'builderPrice';
    default:
      return 'retailPrice';
  }
}

function memberPriceForRole(row: {
  waterworkerPrice: number | null;
  builderPrice: number | null;
  distributor2Price: number | null;
  dealer1Price: number | null;
  level1Price: number;
  level2Price: number;
  level3Price: number;
}, role: UserRole | null | undefined): { value: number | null; label: string; level: number } {
  const level = role ? roleToPriceLevel(role) : 0;
  if (config.tradePricingMode === 'uniform' && level) {
    return { value: row.level2Price, label: 'Trade price', level };
  }
  switch (role) {
    case 'REGIONAL_AGENT':
      return { value: row.dealer1Price ?? row.level1Price, label: 'Dealer price', level: 1 };
    case 'LICENSED_TRADESMAN':
      return { value: row.level2Price, label: 'VIP price', level: 2 };
    case 'SUB_DEALER':
      return { value: row.distributor2Price ?? row.level3Price, label: 'Sub-dealer price', level: 3 };
    case 'WATERWORKER':
      return { value: row.waterworkerPrice ?? row.level2Price, label: 'Waterworker price', level: 4 };
    case 'BUILDER':
      return { value: row.builderPrice ?? row.level3Price, label: 'Builder price', level: 5 };
    default:
      return { value: null, label: '', level: 0 };
  }
}

export function resolvePriceVisibility(user: {
  accountStatus: AccountStatus;
  role: UserRole;
} | null): { visible: boolean; reason: PriceResult['reason']; level?: number } {
  if (!user) return { visible: false, reason: 'NOT_LOGGED_IN' };
  if (user.accountStatus !== AccountStatus.ACTIVE) return { visible: false, reason: 'UNDER_REVIEW' };
  const level = roleToPriceLevel(user.role);
  if (!level) return { visible: false, reason: 'NO_PERMISSION' };
  return { visible: true, reason: 'OK', level };
}

export async function getPriceForProduct(
  productId: number,
  user: { accountStatus: AccountStatus; role: UserRole } | null,
  requesterIp?: string,
  requesterUserId?: number,
): Promise<PriceResult> {
  const priceRow = await prisma.productPrice.findUnique({ where: { productId } });
  if (!priceRow) return { visible: false, reason: 'NO_PERMISSION' };

  if (!user) {
    return {
      visible: true,
      reason: 'OK',
      price: priceRow.promoPrice ?? priceRow.retailPrice ?? priceRow.level1Price,
      currency: priceRow.currency,
      level: 0,
    };
  }

  const vis = resolvePriceVisibility(user);
  if (!vis.visible || !vis.level) {
    return vis;
  }

  if (requesterUserId) {
    await logSecurityEvent({
      level: 'INFO',
      eventType: 'PRICE_QUERY',
      details: `product ${productId}`,
      ip: requesterIp,
      userId: requesterUserId,
    });
    await checkPriceBurst(requesterUserId);
  }

  const price = config.tradePricingMode === 'uniform' ? priceRow.level2Price :
    vis.level === 1 ? (priceRow.dealer1Price ?? priceRow.level1Price) :
    vis.level === 2 ? priceRow.level2Price :
    vis.level === 3 ? (priceRow.distributor2Price ?? priceRow.level3Price) :
    vis.level === 4 ? (priceRow.waterworkerPrice ?? priceRow.level2Price) :
    vis.level === 5 ? (priceRow.builderPrice ?? priceRow.level3Price) :
    priceRow.level3Price;
  return { visible: true, reason: 'OK', price, currency: priceRow.currency, level: vis.level };
}

export async function getUnitPriceForLevel(productId: number, level: number): Promise<number> {
  const priceRow = await prisma.productPrice.findUnique({ where: { productId } });
  if (!priceRow) throw new Error('No price configured for product');
  const price = config.tradePricingMode === 'uniform' ? priceRow.level2Price :
    level === 1 ? (priceRow.dealer1Price ?? priceRow.level1Price) :
    level === 2 ? priceRow.level2Price :
    level === 3 ? (priceRow.distributor2Price ?? priceRow.level3Price) :
    level === 4 ? (priceRow.waterworkerPrice ?? priceRow.level2Price) :
    level === 5 ? (priceRow.builderPrice ?? priceRow.level3Price) :
    priceRow.level3Price;
  if (price === null || price === undefined) throw new Error('Price level not configured');
  return price;
}

export async function getVisiblePriceForProduct(productId: number, role: UserRole | null | undefined): Promise<VisibleProductPrices | null> {
  const priceRow = await prisma.productPrice.findUnique({ where: { productId } });
  if (!priceRow) return null;
  const member = memberPriceForRole(priceRow, role);
  const isActivePartner = member.level > 0;
  return {
    retail: isActivePartner ? null : priceRow.retailPrice,
    promo: isActivePartner ? null : priceRow.promoPrice,
    member: member.value,
    memberLabel: member.label,
    memberLevel: member.level,
    currency: priceRow.currency,
    rrp: isActivePartner ? null : priceRow.rrp,
  };
}
