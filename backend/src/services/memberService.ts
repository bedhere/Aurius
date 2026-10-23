import { prisma } from '../lib/prisma';
import { generateAurId, roleToPriceLevel } from './sequenceService';
import { audit } from './auditService';
import { sendMail } from './mailService';
import {
  AccountStatus,
  ApplicationStatus,
  LicenceType,
  TradeType,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import { config } from '../config';
import { conflict } from '../lib/response';

export function roleDisplayName(role: UserRole): string {
  switch (role) {
    case 'REGIONAL_AGENT':
      return 'Regional Exclusive Agent (Level 1)';
    case 'LICENSED_TRADESMAN':
      return 'Licensed Tradesman (Level 2)';
    case 'SUB_DEALER':
      return 'Sub-dealer (Level 3)';
    case 'WATERWORKER':
      return 'Waterworker';
    case 'BUILDER':
      return 'Builder';
    default:
      return role;
  }
}

export function channelForRole(role: UserRole): 'VIP' | 'TRADE' {
  return ['LICENSED_TRADESMAN', 'WATERWORKER', 'BUILDER'].includes(role) ? 'VIP' : 'TRADE';
}

function loginUrlFor(role: UserRole): string {
  return `${config.frontendUrl}${channelForRole(role) === 'VIP' ? '/plumbers-builders' : '/trade'}`;
}

// ---------------------------------------------------------------------------
// Approval flow (requirement 26). One transaction performs:
// status update → role → price level → unique AUR ID → permissions
// (pricing/ordering/downloads derive from ACTIVE + role at request time)
// → review log → audit → approval email.
// ---------------------------------------------------------------------------

export async function approveApplication(
  applicationId: number,
  reviewer: { id: number; email: string },
  role: UserRole,
  notes: string,
  ip?: string,
): Promise<{ userId: number; aurId: string }> {
  const app = await prisma.partnerApplication.findUnique({
    where: { id: applicationId },
    include: { user: true },
  });
  if (!app) throw new Error('Application not found');
  if (app.status === 'APPROVED') throw conflict('Application already approved');
  if (role === 'ADMIN') throw new Error('Cannot approve an application with the ADMIN role');

  const level = roleToPriceLevel(role);
  const { aurId, prefix, year, sequence } = await generateAurId(role);

  const result = await prisma.$transaction(async (tx) => {
    // 1. user status + role
    await tx.user.update({
      where: { id: app.userId },
      data: { accountStatus: AccountStatus.ACTIVE, role, memberLevel: level },
    });

    // 2. member profile (create or update)
    const profileData = {
      firstName: app.firstName,
      lastName: app.lastName,
      companyName: app.companyName,
      phone: app.phone,
      website: app.website,
      socialMedia: app.socialMedia,
      streetAddress: app.streetAddress,
      suburb: app.suburb,
      state: app.state,
      postcode: app.postcode,
      country: app.country,
      region: app.state,
      approvedAt: new Date(),
    };
    await tx.memberProfile.upsert({
      where: { userId: app.userId },
      create: { userId: app.userId, ...profileData },
      update: profileData,
    });

    // 3. permanent unique AUR ID
    await tx.memberId.upsert({
      where: { userId: app.userId },
      create: { userId: app.userId, aurId, prefix, year, sequence },
      update: {}, // never overwrite an existing permanent ID
    });

    // 4. application approved
    await tx.partnerApplication.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.APPROVED, lastReviewedAt: new Date(), reviewNotes: notes },
    });

    // 5. licence record for VIP applicants
    if (app.tradeType !== 'NOT_APPLICABLE') {
      await tx.licence.create({
        data: {
          userId: app.userId,
          tradeType: app.tradeType,
          licenceType: app.licenceType,
          licenceNumber: app.licenceNumber,
          state: app.state,
          verificationStatus: VerificationStatus.PENDING,
        },
      });
    }

    // 6. review log (requirement 24)
    await tx.applicationReviewLog.create({
      data: {
        applicationId,
        reviewerId: reviewer.id,
        previousStatus: app.status,
        newStatus: ApplicationStatus.APPROVED,
        reviewNotes: notes,
        action: 'APPROVE',
        ip,
      },
    });
    return { aurId };
  });

  // 7. audit
  await audit({
    userId: reviewer.id,
    action: 'MEMBER_APPROVED',
    targetType: 'Application',
    targetId: String(applicationId),
    details: { approvedUserId: app.userId, aurId, role },
    ip,
  });

  // 8. approval email with name / AUR ID / role / login entry / usage notes
  await sendMail({
    to: app.user.email,
    template: 'APPLICATION_APPROVED',
    userId: app.userId,
    data: {
      firstName: app.firstName,
      aurId,
      roleName: roleDisplayName(role),
      loginUrl: loginUrlFor(role),
    },
  });

  return { userId: app.userId, aurId: result.aurId };
}

export async function rejectApplication(
  applicationId: number,
  reviewer: { id: number },
  reason: string,
  ip?: string,
): Promise<void> {
  const app = await prisma.partnerApplication.findUnique({
    where: { id: applicationId },
    include: { user: true },
  });
  if (!app) throw new Error('Application not found');

  await prisma.$transaction(async (tx) => {
    await tx.partnerApplication.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.REJECTED,
        rejectReason: reason,
        lastReviewedAt: new Date(),
      },
    });
    await tx.user.update({
      where: { id: app.userId },
      data: { accountStatus: AccountStatus.REJECTED },
    });
    await tx.applicationReviewLog.create({
      data: {
        applicationId,
        reviewerId: reviewer.id,
        previousStatus: app.status,
        newStatus: ApplicationStatus.REJECTED,
        reviewNotes: reason,
        action: 'REJECT',
        ip,
      },
    });
  });

  await audit({
    userId: reviewer.id,
    action: 'MEMBER_REJECTED',
    targetType: 'Application',
    targetId: String(applicationId),
    details: { rejectedUserId: app.userId, reason },
    ip,
  });

  await sendMail({
    to: app.user.email,
    template: 'APPLICATION_REJECTED',
    userId: app.userId,
    data: { firstName: app.firstName, reason },
  });
}

export async function requestMoreInfo(
  applicationId: number,
  reviewer: { id: number },
  requestedInfo: string,
  ip?: string,
): Promise<void> {
  const app = await prisma.partnerApplication.findUnique({
    where: { id: applicationId },
    include: { user: true },
  });
  if (!app) throw new Error('Application not found');

  await prisma.$transaction(async (tx) => {
    await tx.partnerApplication.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.MORE_INFO_REQUIRED,
        requestedInfo,
        lastReviewedAt: new Date(),
      },
    });
    await tx.user.update({
      where: { id: app.userId },
      data: { accountStatus: AccountStatus.MORE_INFO_REQUIRED },
    });
    await tx.applicationReviewLog.create({
      data: {
        applicationId,
        reviewerId: reviewer.id,
        previousStatus: app.status,
        newStatus: ApplicationStatus.MORE_INFO_REQUIRED,
        reviewNotes: requestedInfo,
        action: 'REQUEST_MORE_INFO',
        ip,
      },
    });
  });

  await audit({
    userId: reviewer.id,
    action: 'APPLICATION_REVIEWED',
    targetType: 'Application',
    targetId: String(applicationId),
    details: { action: 'REQUEST_MORE_INFO', requestedInfo },
    ip,
  });

  await sendMail({
    to: app.user.email,
    template: 'MORE_INFORMATION_REQUIRED',
    userId: app.userId,
    data: { firstName: app.firstName, requestedInfo },
  });
}

export async function freezeMember(
  userId: number,
  adminId: number,
  reason: string,
  ip?: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  await prisma.user.update({ where: { id: userId }, data: { accountStatus: AccountStatus.FROZEN } });
  await audit({
    userId: adminId,
    action: 'MEMBER_FROZEN',
    targetType: 'Member',
    targetId: String(userId),
    details: { reason },
    ip,
  });
  await sendMail({
    to: user.email,
    template: 'ROLE_CHANGED',
    userId,
    data: { firstName: user.email, roleName: 'Frozen', aurId: '' },
  });
}

export async function unfreezeMember(userId: number, adminId: number, ip?: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  await prisma.user.update({ where: { id: userId }, data: { accountStatus: AccountStatus.ACTIVE } });
  await audit({
    userId: adminId,
    action: 'MEMBER_UNFROZEN',
    targetType: 'Member',
    targetId: String(userId),
    ip,
  });
}

/**
 * A rejected / more-info applicant resubmits their (possibly corrected)
 * application. The original record is preserved; a resubmission timestamp
 * is set and the application returns to review queue.
 */
export async function resubmitApplication(
  userId: number,
  updates: {
    partnershipType?: string;
    intendedTerritory?: string | null;
    firstName: string;
    lastName: string;
    companyName: string;
    streetAddress: string;
    suburb: string;
    state?: string;
    postcode: string;
    phone?: string;
    website?: string;
    socialMedia?: string;
    tradeType: TradeType;
    licenceType?: LicenceType;
    licenceNumber?: string;
    abnNumber?: string;
    yearsExperience?: number;
    smartToiletExp?: string;
    waterPurifExp?: string;
    additionalNotes?: string;
    businessInterest?: string;
    privacyConsent: boolean;
    dealerAgreement: boolean;
    marketingConsent: boolean;
  },
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.partnerApplication.update({
      where: { userId },
      data: {
        ...updates,
        status: ApplicationStatus.SUBMITTED,
        rejectReason: null,
        requestedInfo: null,
        resubmittedAt: new Date(),
        lastReviewedAt: null,
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { accountStatus: AccountStatus.PENDING_REVIEW },
    });
  });
  await audit({
    userId,
    action: 'APPLICATION_SUBMITTED',
    targetType: 'Application',
    details: { resubmitted: true },
  });
}
