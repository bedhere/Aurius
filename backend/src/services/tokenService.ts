import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';

export interface AccessTokenPayload {
  uid: number;
  role: UserRole;
  aurId?: string | null;
  memberLevel?: number | null;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtAccessTtl,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwtSecret) as AccessTokenPayload;
}

export function issueRefreshToken(userId: number, ip: string | undefined, userAgent: string | undefined): string {
  const raw = crypto.randomBytes(48).toString('base64url');
  return raw;
}

export async function storeRefreshToken(
  userId: number,
  raw: string,
  ip: string | undefined,
  userAgent: string | undefined,
): Promise<void> {
  const expiresInMs = parseTtlMs(config.jwtRefreshTtl);
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + expiresInMs),
      ip,
      userAgent,
    },
  });
}

export async function rotateRefreshToken(
  oldRaw: string,
  userId: number,
  ip: string | undefined,
  userAgent: string | undefined,
): Promise<string> {
  const hash = hashToken(oldRaw);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    throw new Error('INVALID_REFRESH');
  }
  await prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
  const raw = issueRefreshToken(userId, ip, userAgent);
  await storeRefreshToken(userId, raw, ip, userAgent);
  return raw;
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  const hash = hashToken(raw);
  await prisma.refreshToken
    .updateMany({ where: { tokenHash: hash }, data: { revokedAt: new Date() } })
    .catch(() => undefined);
}

export async function revokeAllUserTokens(userId: number): Promise<void> {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function parseTtlMs(ttl: string): number {
  const m = ttl.match(/^(\d+)([smhd])$/);
  if (!m) return 7 * 24 * 3600 * 1000;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  const factors: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * (factors[unit] ?? 86_400_000);
}
