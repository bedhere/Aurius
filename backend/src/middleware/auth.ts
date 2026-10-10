import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { verifyAccessToken, AccessTokenPayload } from '../services/tokenService';
import { AccountStatus } from '@prisma/client';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload & {
        accountStatus?: AccountStatus;
      };
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

function authError(res: Response, message = 'Authentication required'): void {
  res.status(401).json({ success: false, message, errors: [] });
}

/**
 * Verifies the access token and enriches the request with the current user's
 * live account status (so a frozen/rejected account loses access immediately,
 * not just on token expiry). Returns true when authenticated.
 */
async function authenticate(req: Request, res: Response): Promise<boolean> {
  const token = extractToken(req);
  if (!token) {
    authError(res);
    return false;
  }
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.uid } });
    if (!user || user.deletedAt) {
      authError(res, 'Account no longer exists');
      return false;
    }
    req.auth = { ...payload, accountStatus: user.accountStatus, role: user.role };
    return true;
  } catch {
    authError(res, 'Invalid or expired token');
    return false;
  }
}

/** Strict authentication — 401 without a valid token. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (await authenticate(req, res)) next();
}

/**
 * Verifies the token if present, but allows anonymous access. Used by public
 * catalogue endpoints so the caller's own price tier can be resolved.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.uid } });
    if (user && !user.deletedAt) {
      req.auth = { ...payload, accountStatus: user.accountStatus, role: user.role };
    }
  } catch {
    // invalid token → treat as anonymous
  }
  next();
}

/**
 * Full B2B member permission: authenticated + account ACTIVE + member role.
 * Required for pricing, cart, ordering and downloads (requirement 75).
 */
export async function requireActiveMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!(await authenticate(req, res))) return;
  const auth = req.auth!;
  if (auth.accountStatus !== AccountStatus.ACTIVE) {
    res.status(403).json({
      success: false,
      message: 'Your application is under review. This feature is not available yet.',
      errors: [],
    });
    return;
  }
  const memberRoles = ['REGIONAL_AGENT', 'LICENSED_TRADESMAN', 'SUB_DEALER', 'WATERWORKER', 'BUILDER'];
  if (!memberRoles.includes(auth.role)) {
    res.status(403).json({ success: false, message: 'Permission denied', errors: [] });
    return;
  }
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!(await authenticate(req, res))) return;
  if (req.auth!.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Admin permission required', errors: [] });
    return;
  }
  next();
}

/**
 * Authenticated but not necessarily ACTIVE — used for the "application under
 * review" dashboard where pending users may view their own status.
 */
export async function requireAuthAnyStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (await authenticate(req, res)) next();
}
