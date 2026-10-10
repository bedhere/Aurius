import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { ok, badRequest, unauthorized, forbidden } from '../lib/response';
import { hashPassword, verifyPassword, validatePasswordPolicy } from '../services/passwordService';
import {
  signAccessToken,
  storeRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  hashToken,
  parseTtlMs,
} from '../services/tokenService';
import { audit } from '../services/auditService';
import { logSecurityEvent, checkFailedLogins, checkMultiAccountFromIp } from '../services/securityService';
import { sendMail } from '../services/mailService';
import { config } from '../config';
import { AccountStatus } from '@prisma/client';

const REFRESH_COOKIE = 'aurius_refresh';

function ipOf(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const ip = ipOf(req);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || user.deletedAt) {
      res.status(401).json({ success: false, message: 'Invalid email or password', errors: [] });
      return;
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to too many failed attempts. Try again later.',
        errors: [],
      });
      return;
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const failed = user.failedLogins + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: failed,
          lockedUntil: failed >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });
      await logSecurityEvent({ level: 'WARNING', eventType: 'FAILED_LOGIN', details: `Failed login for ${user.email}`, ip, userId: user.id });
      await checkFailedLogins(ip);
      res.status(401).json({ success: false, message: 'Invalid email or password', errors: [] });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ip },
    });
    await checkMultiAccountFromIp(ip);
    await audit({
      userId: user.id,
      action: user.role === 'ADMIN' ? 'ADMIN_LOGIN' : 'LOGIN',
      ip,
      userAgent: req.headers['user-agent'],
    });

    const memberId = await prisma.memberId.findUnique({ where: { userId: user.id } });
    const access = signAccessToken({
      uid: user.id,
      role: user.role,
      aurId: memberId?.aurId ?? null,
      memberLevel: user.memberLevel,
    });
    const refresh = crypto.randomBytes(48).toString('base64url');
    await storeRefreshToken(user.id, refresh, ip, req.headers['user-agent']);

    res.cookie(REFRESH_COOKIE, refresh, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.env === 'production',
      maxAge: parseTtlMs(config.jwtRefreshTtl),
      path: '/api/auth',
    });

    ok(res, {
      accessToken: access,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        memberLevel: user.memberLevel,
        aurId: memberId?.aurId ?? null,
      },
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!raw) {
      res.status(401).json({ success: false, message: 'No refresh token', errors: [] });
      return;
    }
    const hash = hashToken(raw);
    const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      res.status(401).json({ success: false, message: 'Invalid refresh token', errors: [] });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (!user || user.deletedAt) {
      res.status(401).json({ success: false, message: 'Account no longer exists', errors: [] });
      return;
    }
    const newRaw = await rotateRefreshToken(raw, user.id, ipOf(req), req.headers['user-agent']);
    const memberId = await prisma.memberId.findUnique({ where: { userId: user.id } });
    const access = signAccessToken({
      uid: user.id,
      role: user.role,
      aurId: memberId?.aurId ?? null,
      memberLevel: user.memberLevel,
    });
    res.cookie(REFRESH_COOKIE, newRaw, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.env === 'production',
      maxAge: parseTtlMs(config.jwtRefreshTtl),
      path: '/api/auth',
    });
    ok(res, { accessToken: access, accountStatus: user.accountStatus }, 'Token refreshed');
  } catch (err) {
    if (err instanceof Error && err.message === 'INVALID_REFRESH') {
      res.status(401).json({ success: false, message: 'Invalid refresh token', errors: [] });
      return;
    }
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (raw) await revokeRefreshToken(raw);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    if (req.auth) {
      await audit({ userId: req.auth.uid, action: 'LOGOUT', ip: ipOf(req) });
    }
    ok(res, null, 'Logged out');
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.uid },
      include: { memberId: true, memberProfile: true, application: true },
    });
    if (!user) {
      res.status(401).json({ success: false, message: 'Account not found', errors: [] });
      return;
    }
    const { passwordHash, ...safe } = user;
    void passwordHash;
    ok(res, {
      ...safe,
      applicationStatus: user.application?.status ?? null,
      underReview: user.accountStatus === AccountStatus.PENDING_REVIEW,
      rejectReason: user.application?.rejectReason ?? null,
      requestedInfo: user.application?.requestedInfo ?? null,
    });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    // Always respond success to avoid email enumeration
    if (user) {
      const raw = crypto.randomBytes(32).toString('base64url');
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(raw),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      await sendMail({
        to: user.email,
        template: 'PASSWORD_RESET',
        userId: user.id,
        data: { resetUrl: `${config.frontendUrl}/reset-password?token=${raw}` },
      });
    }
    ok(res, null, 'If the email exists, a reset link has been sent');
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, password } = req.body as { token: string; password: string };
    const policy = validatePasswordPolicy(password);
    if (!policy.valid) throw badRequest(policy.errors.join('; '), policy.errors);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw badRequest('Reset link is invalid or has expired');
    }
    const hash = await hashPassword(password);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash: hash } });
      await tx.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    });
    await audit({ userId: record.userId, action: 'SETTINGS_CHANGED', targetType: 'User', targetId: String(record.userId), details: { changed: 'password' } });
    ok(res, null, 'Password has been reset. You can now log in.');
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    const user = await prisma.user.findUnique({ where: { id: req.auth!.uid } });
    if (!user) throw unauthorized();
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw badRequest('Current password is incorrect');
    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) throw badRequest(policy.errors.join('; '), policy.errors);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
    await audit({ userId: user.id, action: 'SETTINGS_CHANGED', targetType: 'User', targetId: String(user.id), details: { changed: 'password' }, ip: ipOf(req) });
    ok(res, null, 'Password updated');
  } catch (err) {
    next(err);
  }
}
