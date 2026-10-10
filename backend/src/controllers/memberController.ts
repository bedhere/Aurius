import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, badRequest, forbidden, notFound } from '../lib/response';
import { getUserPerformance } from '../services/performanceService';
import { audit } from '../services/auditService';
import { encryptField, SALT_PHONE } from '../lib/crypto';

function ipOf(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

export async function myPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await getUserPerformance(req.auth!.uid);
    const memberId = await prisma.memberId.findUnique({ where: { userId: req.auth!.uid } });
    ok(res, { ...stats, aurId: memberId?.aurId ?? null });
  } catch (err) {
    next(err);
  }
}

export async function myReferrals(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const memberId = await prisma.memberId.findUnique({ where: { userId: req.auth!.uid } });
    const referrals = await prisma.referralSale.findMany({
      where: {
        OR: [{ referralTechId: memberId?.aurId ?? 'none' }, { technicianUserId: req.auth!.uid }],
      },
      include: { order: { select: { orderNumber: true, orderedAt: true } } },
      orderBy: { createdAt: 'desc' },
    });
    ok(res, referrals.map((r) => ({
      id: r.id,
      orderNumber: r.order.orderNumber,
      orderAmount: r.orderAmount,
      status: r.status,
      creditedAt: r.creditedAt,
      orderDate: r.order.orderedAt,
    })));
  } catch (err) {
    next(err);
  }
}

export async function registerInstallation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.auth!.role !== 'WATERWORKER') {
      throw forbidden('Only waterworker accounts can register installations');
    }
    const userId = req.auth!.uid;
    const body = req.body as {
      technicianAurId?: string | null;
      contactEmail?: string | null;
      productId?: number | null;
      productName: string;
      serialNumber?: string | null;
      installationDate?: string | null;
      installationAddress?: string | null;
    };
    const memberId = await prisma.memberId.findUnique({ where: { userId } });
    const record = await prisma.installationRecord.create({
      data: {
        technicianUserId: userId,
        technicianAurId: body.technicianAurId ?? memberId?.aurId ?? null,
        contactEmail: body.contactEmail ?? null,
        productId: body.productId ?? null,
        productName: body.productName,
        serialNumber: body.serialNumber ?? null,
        installationDate: body.installationDate ? new Date(body.installationDate) : null,
        installationAddress: body.installationAddress ?? null,
        reportedBy: userId,
      },
    });
    await audit({
      userId,
      action: 'INSTALLATION_REGISTERED',
      targetType: 'Installation',
      targetId: String(record.id),
      ip: ipOf(req),
    });
    ok(res, { id: record.id }, 'Installation registered');
  } catch (err) {
    next(err);
  }
}

export async function myInstallations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const list = await prisma.installationRecord.findMany({
      where: { technicianUserId: req.auth!.uid },
      orderBy: { createdAt: 'desc' },
    });
    ok(res, list);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.auth!.uid;
    const body = req.body as {
      firstName: string;
      lastName: string;
      phone?: string | null;
      website?: string | null;
      socialMedia?: string | null;
      streetAddress: string;
      suburb: string;
      state?: string;
      postcode: string;
    };
    // Member ID / role / price level / licence fields are intentionally NOT
    // editable here (requirement 49).
    await prisma.memberProfile.update({
      where: { userId },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone ? encryptField(body.phone, SALT_PHONE) : undefined,
        website: body.website ?? undefined,
        socialMedia: body.socialMedia ?? undefined,
        streetAddress: body.streetAddress,
        suburb: body.suburb,
        state: body.state ?? undefined,
        postcode: body.postcode,
      },
    });
    await audit({ userId, action: 'SETTINGS_CHANGED', targetType: 'Profile', targetId: String(userId), ip: ipOf(req) });
    ok(res, null, 'Profile updated');
  } catch (err) {
    next(err);
  }
}

export async function myProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await prisma.memberProfile.findUnique({ where: { userId: req.auth!.uid } });
    if (!profile) throw notFound('Profile not found');
    ok(res, profile);
  } catch (err) {
    next(err);
  }
}

export async function listAddresses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const list = await prisma.shippingAddress.findMany({
      where: { userId: req.auth!.uid },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    ok(res, list);
  } catch (err) {
    next(err);
  }
}

export async function createAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.auth!.uid;
    const body = req.body as {
      label?: string;
      contactName: string;
      phone: string;
      street: string;
      suburb: string;
      state: string;
      postcode: string;
      country?: string;
    };
    const count = await prisma.shippingAddress.count({ where: { userId } });
    const address = await prisma.shippingAddress.create({
      data: {
        userId,
        label: body.label ?? 'Address',
        contactName: body.contactName,
        phone: body.phone,
        street: body.street,
        suburb: body.suburb,
        state: body.state,
        postcode: body.postcode,
        country: body.country ?? 'Australia',
        isDefault: count === 0,
      },
    });
    ok(res, address, 'Address saved');
  } catch (err) {
    next(err);
  }
}

export async function deleteAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const address = await prisma.shippingAddress.findFirst({ where: { id, userId: req.auth!.uid } });
    if (!address) throw notFound('Address not found');
    await prisma.shippingAddress.delete({ where: { id } });
    ok(res, null, 'Address removed');
  } catch (err) {
    next(err);
  }
}
