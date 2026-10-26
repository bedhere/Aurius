import { NextFunction, Request, Response } from 'express';
import { DealerLocation } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, created, notFound, ok } from '../lib/response';
import { validated } from '../middleware/validate';
import { audit } from '../services/auditService';
import { DealerLocationInput } from '../validators/dealerLocation.schema';

function ipOf(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

function parsePhotos(value: string): string[] {
  try {
    const photos = JSON.parse(value);
    return Array.isArray(photos) && photos.every((photo) => typeof photo === 'string') ? photos : [];
  } catch {
    return [];
  }
}

function serializeLocation(location: DealerLocation): Omit<DealerLocation, 'photos'> & { photos: string[] } {
  return { ...location, photos: parsePhotos(location.photos) };
}

function locationData(input: DealerLocationInput) {
  return {
    ...input,
    phone: input.phone || null,
    city: input.city || null,
    state: input.state || null,
    note: input.note || null,
    photos: JSON.stringify(input.photos),
  };
}

function locationId(req: Request): number {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Invalid dealer location id');
  return id;
}

export async function listPublicDealerLocations(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const locations = await prisma.dealerLocation.findMany({
      where: { active: true, authorised: true, partnerType: 'REGIONAL_DISTRIBUTOR' },
      orderBy: [{ state: 'asc' }, { name: 'asc' }],
    });
    ok(res, locations.map(serializeLocation));
  } catch (err) {
    next(err);
  }
}

export async function listAdminDealerLocations(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const locations = await prisma.dealerLocation.findMany({
      orderBy: [{ state: 'asc' }, { name: 'asc' }],
    });
    ok(res, locations.map(serializeLocation));
  } catch (err) {
    next(err);
  }
}

export async function createDealerLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validated<DealerLocationInput>(req);
    const location = await prisma.dealerLocation.create({ data: locationData(input) });
    await audit({
      userId: req.auth!.uid,
      action: 'SETTINGS_CHANGED',
      targetType: 'DealerLocation',
      targetId: String(location.id),
      details: { created: true },
      ip: ipOf(req),
    });
    created(res, serializeLocation(location), 'Dealer location created');
  } catch (err) {
    next(err);
  }
}

export async function updateDealerLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = locationId(req);
    const existing = await prisma.dealerLocation.findUnique({ where: { id } });
    if (!existing) throw notFound('Dealer location not found');
    const input = validated<DealerLocationInput>(req);
    const location = await prisma.dealerLocation.update({
      where: { id },
      data: locationData(input),
    });
    await audit({
      userId: req.auth!.uid,
      action: 'SETTINGS_CHANGED',
      targetType: 'DealerLocation',
      targetId: String(id),
      details: { updated: true },
      ip: ipOf(req),
    });
    ok(res, serializeLocation(location), 'Dealer location updated');
  } catch (err) {
    next(err);
  }
}

export async function deleteDealerLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = locationId(req);
    const existing = await prisma.dealerLocation.findUnique({ where: { id } });
    if (!existing) throw notFound('Dealer location not found');
    await prisma.dealerLocation.delete({ where: { id } });
    await audit({
      userId: req.auth!.uid,
      action: 'SETTINGS_CHANGED',
      targetType: 'DealerLocation',
      targetId: String(id),
      details: { deleted: true },
      ip: ipOf(req),
    });
    ok(res, null, 'Dealer location deleted');
  } catch (err) {
    next(err);
  }
}
