import { config } from '../config';
import { prisma } from '../lib/prisma';
import { encryptField, SALT_ABN, safeDecrypt } from '../lib/crypto';
import { VerificationMethod, VerificationStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// ABN verification. Two paths:
//  1. ABR (Australian Business Register) API — requires ABR_API_KEY / ABR_GUID
//     from .env. When credentials are absent the adapter reports NOT_CONFIGURED
//     and manual verification remains available in the admin panel.
//  2. Manual verification by an admin with notes (always available).
// Nothing here pretends a real ABR check succeeded without credentials.
// ---------------------------------------------------------------------------

export interface AbrCheckResult {
  configured: boolean;
  success: boolean;
  message: string;
  abn?: string;
  entityName?: string;
  status?: string;
  state?: string;
}

export async function checkAbnWithAbr(abnPlain: string): Promise<AbrCheckResult> {
  if (!config.abr.apiKey || !config.abr.guid) {
    return {
      configured: false,
      success: false,
      message: 'ABR API is not configured. Use manual verification.',
    };
  }
  try {
    const url = `https://abr.business.gov.au/ABN/Details?abn=${encodeURIComponent(abnPlain)}&guid=${encodeURIComponent(config.abr.guid)}`;
    const res = await fetch(url, { headers: { Authorization: config.abr.apiKey } });
    const text = await res.text();
    if (!res.ok) {
      return { configured: true, success: false, message: `ABR error ${res.status}: ${text.slice(0, 200)}` };
    }
    // Basic parse of the public ABR XML/JSON response
    const nameMatch = text.match(/<entityName>([^<]+)<\/entityName>/);
    const stateMatch = text.match(/<stateCode>([^<]+)<\/stateCode>/);
    const statusMatch = text.match(/<entityStatusCode>([^<]+)<\/entityStatusCode>/);
    const entityName = nameMatch ? nameMatch[1] : undefined;
    return {
      configured: true,
      success: true,
      message: 'ABR lookup succeeded',
      abn: abnPlain,
      entityName,
      status: statusMatch ? statusMatch[1] : undefined,
      state: stateMatch ? stateMatch[1] : undefined,
    };
  } catch (err) {
    return {
      configured: true,
      success: false,
      message: `ABR request failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Manual verification by an admin. Encrypts the verified ABN copy for the
 * audit trail and updates application/licence verification state.
 */
export async function recordManualAbnVerification(
  applicationId: number,
  verifiedBy: number,
  result: VerificationStatus,
  notes: string,
  ip?: string,
): Promise<void> {
  const app = await prisma.partnerApplication.findUnique({ where: { id: applicationId } });
  if (!app) return;
  const abnPlain = safeDecrypt(app.abnNumber, SALT_ABN);
  await prisma.partnerApplication.update({
    where: { id: applicationId },
    data: {
      abnStatus: result,
      abnVerifiedAt: result === 'VERIFIED' ? new Date() : null,
      abnVerifiedBy: verifiedBy,
      abnVerifiedNote: notes,
    },
  });
  await prisma.verificationRecord.create({
    data: {
      targetType: 'ABN',
      targetValue: abnPlain ? encryptField(abnPlain, SALT_ABN) : null,
      method: VerificationMethod.MANUAL,
      result,
      verifiedBy,
      notes,
      ip,
    },
  });
}

/**
 * Verify ABN against ABR. When ABR is unavailable, leave the application
 * untouched so an admin must use the explicit manual verification action.
 */
export async function verifyAbn(applicationId: number, verifiedBy: number, ip?: string): Promise<AbrCheckResult> {
  const app = await prisma.partnerApplication.findUnique({ where: { id: applicationId } });
  if (!app) return { configured: false, success: false, message: 'Application not found' };
  const abnPlain = safeDecrypt(app.abnNumber, SALT_ABN);
  if (!abnPlain) return { configured: false, success: false, message: 'No ABN recorded on this application' };
  const result = await checkAbnWithAbr(abnPlain);
  if (result.success) {
    await prisma.partnerApplication.update({
      where: { id: applicationId },
      data: {
        abnStatus: 'VERIFIED',
        abnVerifiedAt: new Date(),
        abnVerifiedBy: verifiedBy,
        abnVerifiedNote: `ABR verified${result.entityName ? `: ${result.entityName}` : ''}`,
      },
    });
    await prisma.verificationRecord.create({
      data: {
        targetType: 'ABN',
        targetValue: encryptField(abnPlain, SALT_ABN),
        method: VerificationMethod.ABR_API,
        result: 'VERIFIED',
        verifiedBy,
        notes: result.entityName ?? result.message,
        ip,
      },
    });
  }
  return result;
}
