import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, badRequest, forbidden, notFound, created } from '../lib/response';
import { validated } from '../middleware/validate';
import { hashPassword } from '../services/passwordService';
import { generateApplicationNumber } from '../services/sequenceService';
import { audit } from '../services/auditService';
import { sendMail } from '../services/mailService';
import { verifyRecaptcha } from '../services/recaptchaService';
import { encryptField, SALT_ABN, SALT_LICENCE, SALT_PHONE, safeDecrypt } from '../lib/crypto';
import { resubmitApplication } from '../services/memberService';
import { ApplicationInput } from '../validators/application.schema';
import { AccountStatus, ApplicationStatus, TradeType, UserRole } from '@prisma/client';

function ipOf(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

/**
 * Full registration: creates the account (PENDING_REVIEW) and the partner
 * application in one transaction. Emails are sent after commit.
 */
export async function submitApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = validated<ApplicationInput>(req);
    const ip = ipOf(req);

    // reCAPTCHA v2 (env-configured; skipped when no key is set)
    const captchaOk = await verifyRecaptcha(body.recaptchaToken, ip);
    if (!captchaOk) throw badRequest('reCAPTCHA verification failed. Please try again.');

    const email = body.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw badRequest('An account with this email already exists');

    const role: UserRole =
      body.channel === 'VIP'
        ? UserRole.LICENSED_TRADESMAN
        : body.channel === 'TRADE' && body.licenceType
          ? UserRole.LICENSED_TRADESMAN // trade applicant claiming a licence is still reviewed by admin
          : UserRole.SUB_DEALER;

    const passwordHash = await hashPassword(body.password);
    const applicationNo = await generateApplicationNumber();

    // Encrypt sensitive recoverable fields at rest (requirement 74)
    const abnEnc = body.abnNumber ? encryptField(body.abnNumber, SALT_ABN) : null;
    const licenceEnc = body.licenceNumber ? encryptField(body.licenceNumber, SALT_LICENCE) : null;
    const phoneEnc = body.phone ? encryptField(body.phone, SALT_PHONE) : null;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          accountStatus: AccountStatus.PENDING_REVIEW,
          role,
          memberLevel: role === 'SUB_DEALER' ? 3 : 2,
        },
      });
      const app = await tx.partnerApplication.create({
        data: {
          userId: user.id,
          channel: body.channel,
          partnershipType: body.partnershipType ?? (body.channel === 'VIP' ? 'TRADE_PROFESSIONAL' : 'DEALER'),
          intendedTerritory: body.partnershipType === 'REGIONAL_DISTRIBUTOR' ? body.intendedTerritory ?? null : null,
          applicationNo,
          tradeType: body.tradeType,
          state: body.state,
          licenceType: body.licenceType ?? null,
          licenceNumber: licenceEnc,
          firstName: body.firstName,
          lastName: body.lastName,
          companyName: body.companyName,
          streetAddress: body.streetAddress,
          suburb: body.suburb,
          postcode: body.postcode,
          country: body.country,
          phone: phoneEnc,
          website: body.website ?? null,
          socialMedia: body.socialMedia ?? null,
          abnNumber: abnEnc,
          yearsExperience: body.yearsExperience ?? null,
          smartToiletExp: body.smartToiletExp ?? null,
          waterPurifExp: body.waterPurifExp ?? null,
          additionalNotes: body.additionalNotes ?? null,
          businessInterest: body.businessInterest.join(', '),
          privacyConsent: body.privacyConsent,
          dealerAgreement: body.dealerAgreement,
          marketingConsent: body.marketingConsent ?? false,
          status: ApplicationStatus.SUBMITTED,
        },
      });
      return { user, app };
    });

    await audit({
      userId: result.user.id,
      action: 'REGISTER',
      details: { channel: body.channel },
      ip,
    });
    await audit({
      userId: result.user.id,
      action: 'APPLICATION_SUBMITTED',
      targetType: 'Application',
      targetId: applicationNo,
      ip,
    });

    await sendMail({
      to: email,
      template: 'REGISTRATION_SUBMITTED',
      userId: result.user.id,
      data: { firstName: body.firstName, channel: body.channel, applicationNo },
    });

    created(res, { applicationNo, userId: result.user.id }, 'Application submitted. Our team will review your qualifications.');
  } catch (err) {
    next(err);
  }
}

/**
 * Applicant (rejected / more-info) resubmits corrected details. The original
 * application record is preserved (requirement 27).
 */
export async function resubmit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.auth!.uid;
    const app = await prisma.partnerApplication.findUnique({ where: { userId } });
    if (!app) throw notFound('Application not found');
    if (!['REJECTED', 'MORE_INFO_REQUIRED'].includes(app.status)) {
      throw forbidden('Your application is not in a resubmittable state');
    }
    const body = validated<ApplicationInput>(req);
    const partnershipType = body.partnershipType ?? app.partnershipType;
    const intendedTerritory = body.intendedTerritory === undefined ? app.intendedTerritory : body.intendedTerritory;
    if (partnershipType === 'REGIONAL_DISTRIBUTOR' && (app.channel !== 'TRADE' || !intendedTerritory?.trim())) {
      throw badRequest('Regional distributors must use the Trade channel and specify an intended distribution territory');
    }
    if (app.channel === 'VIP' && partnershipType && partnershipType !== 'TRADE_PROFESSIONAL') {
      throw badRequest('VIP applications are for licensed trade professionals');
    }
    await resubmitApplication(userId, {
      partnershipType: partnershipType ?? undefined,
      intendedTerritory: partnershipType === 'REGIONAL_DISTRIBUTOR' ? intendedTerritory : null,
      firstName: body.firstName,
      lastName: body.lastName,
      companyName: body.companyName,
      streetAddress: body.streetAddress,
      suburb: body.suburb,
      state: body.state ?? app.state ?? undefined,
      postcode: body.postcode,
      tradeType: body.tradeType ?? app.tradeType,
      licenceType: body.licenceType ?? app.licenceType ?? undefined,
      licenceNumber: body.licenceNumber ? encryptField(body.licenceNumber, SALT_LICENCE) : (app.licenceNumber ?? undefined),
      abnNumber: body.abnNumber ? encryptField(body.abnNumber, SALT_ABN) : (app.abnNumber ?? undefined),
      phone: body.phone ? encryptField(body.phone, SALT_PHONE) : (app.phone ?? undefined),
      website: body.website ?? undefined,
      socialMedia: body.socialMedia ?? undefined,
      yearsExperience: body.yearsExperience ?? undefined,
      smartToiletExp: body.smartToiletExp ?? undefined,
      waterPurifExp: body.waterPurifExp ?? undefined,
      additionalNotes: body.additionalNotes ?? undefined,
      businessInterest: body.businessInterest.join(', '),
      privacyConsent: body.privacyConsent,
      dealerAgreement: body.dealerAgreement,
      marketingConsent: body.marketingConsent,
    });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    await sendMail({
      to: user?.email ?? '',
      template: 'REGISTRATION_SUBMITTED',
      userId,
      data: { firstName: body.firstName, channel: app.channel, applicationNo: app.applicationNo },
    });
    ok(res, null, 'Application re-submitted for review');
  } catch (err) {
    next(err);
  }
}

/** Pending users may view their own application status and details. */
export async function myApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.auth!.uid;
    const app = await prisma.partnerApplication.findUnique({ where: { userId } });
    if (!app) throw notFound('No application found');
    ok(res, {
      applicationNo: app.applicationNo,
      channel: app.channel,
      partnershipType: app.partnershipType,
      intendedTerritory: app.intendedTerritory,
      status: app.status,
      tradeType: app.tradeType,
      state: app.state,
      licenceType: app.licenceType,
      licenceNumber: safeDecrypt(app.licenceNumber, SALT_LICENCE),
      firstName: app.firstName,
      lastName: app.lastName,
      companyName: app.companyName,
      streetAddress: app.streetAddress,
      suburb: app.suburb,
      postcode: app.postcode,
      country: app.country,
      phone: safeDecrypt(app.phone, SALT_PHONE),
      website: app.website,
      socialMedia: app.socialMedia,
      abnNumber: safeDecrypt(app.abnNumber, SALT_ABN),
      abnStatus: app.abnStatus,
      yearsExperience: app.yearsExperience,
      smartToiletExp: app.smartToiletExp,
      waterPurifExp: app.waterPurifExp,
      additionalNotes: app.additionalNotes,
      businessInterest: app.businessInterest,
      privacyConsent: app.privacyConsent,
      dealerAgreement: app.dealerAgreement,
      marketingConsent: app.marketingConsent,
      submittedAt: app.submittedAt,
      lastReviewedAt: app.lastReviewedAt,
      rejectReason: app.rejectReason,
      requestedInfo: app.requestedInfo,
      resubmittedAt: app.resubmittedAt,
      reviewLogs: await prisma.applicationReviewLog.findMany({
        where: { applicationId: app.id },
        orderBy: { reviewTime: 'asc' },
        select: { reviewTime: true, previousStatus: true, newStatus: true, reviewNotes: true, action: true },
      }),
    });
  } catch (err) {
    next(err);
  }
}

/** Upload / replace the licence file (JPG/PNG/PDF ≤ 5MB). */
export async function uploadLicenceFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.auth!.uid;
    const file = req.file;
    if (!file) throw badRequest('No file uploaded');
    const app = await prisma.partnerApplication.findUnique({ where: { userId } });
    if (!app) throw notFound('Application not found');

    const existing = await prisma.licence.findFirst({ where: { userId } });
    if (existing && existing.filePath) {
      await prisma.licence.update({
        where: { id: existing.id },
        data: {
          filePath: file.path.replace(/\\/g, '/'),
          fileOriginalName: file.originalname,
          fileMime: file.mimetype,
          fileSize: file.size,
          verificationStatus: 'PENDING',
        },
      });
    } else if (existing) {
      await prisma.licence.update({
        where: { id: existing.id },
        data: {
          filePath: file.path.replace(/\\/g, '/'),
          fileOriginalName: file.originalname,
          fileMime: file.mimetype,
          fileSize: file.size,
          verificationStatus: 'PENDING',
        },
      });
    } else {
      await prisma.licence.create({
        data: {
          userId,
          tradeType: app.tradeType,
          licenceType: app.licenceType,
          licenceNumber: app.licenceNumber,
          state: app.state,
          filePath: file.path.replace(/\\/g, '/'),
          fileOriginalName: file.originalname,
          fileMime: file.mimetype,
          fileSize: file.size,
          verificationStatus: 'PENDING',
        },
      });
    }
    await audit({ userId, action: 'FILE_UPLOADED', targetType: 'Licence', targetId: String(app.id), ip: ipOf(req) });
    ok(res, null, 'Licence file uploaded');
  } catch (err) {
    next(err);
  }
}

export async function myLicence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const licence = await prisma.licence.findFirst({ where: { userId: req.auth!.uid } });
    if (!licence) throw notFound('No licence record');
    ok(res, {
      tradeType: licence.tradeType,
      licenceType: licence.licenceType,
      licenceNumber: safeDecrypt(licence.licenceNumber, SALT_LICENCE),
      state: licence.state,
      fileOriginalName: licence.fileOriginalName,
      verificationStatus: licence.verificationStatus,
      verificationNotes: licence.verificationNotes,
      verifiedAt: licence.verifiedAt,
    });
  } catch (err) {
    next(err);
  }
}
