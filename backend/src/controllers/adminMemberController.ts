import { NextFunction, Request, Response } from 'express';
import path from 'path';
import { prisma } from '../lib/prisma';
import { ok, badRequest, notFound } from '../lib/response';
import {
  approveApplication,
  rejectApplication,
  requestMoreInfo,
  freezeMember,
  unfreezeMember,
} from '../services/memberService';
import { verifyAbn, recordManualAbnVerification } from '../services/abrService';
import { audit } from '../services/auditService';
import { safeDecrypt, SALT_ABN, SALT_LICENCE, SALT_PHONE } from '../lib/crypto';
import { UserRole } from '@prisma/client';

function ipOf(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

function decryptApplication(app: {
  abnNumber: string | null;
  licenceNumber: string | null;
  phone: string | null;
} & Record<string, unknown>) {
  return {
    ...app,
    abnNumber: safeDecrypt(app.abnNumber, SALT_ABN),
    licenceNumber: safeDecrypt(app.licenceNumber, SALT_LICENCE),
    phone: safeDecrypt(app.phone, SALT_PHONE),
  };
}

export async function listApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = req.query.status as string | undefined;
    const channel = req.query.channel as string | undefined;
    const partnershipType = req.query.partnershipType as string | undefined;
    if (partnershipType && !['REGIONAL_DISTRIBUTOR', 'DEALER', 'TRADE_PROFESSIONAL'].includes(partnershipType)) {
      throw badRequest('A valid partnership type is required');
    }
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) ?? '20', 10) || 20));

    const where = {
      ...(status ? { status: status as never } : {}),
      ...(channel ? { channel: channel as never } : {}),
      ...(partnershipType ? { partnershipType } : {}),
      ...(search
        ? {
            OR: [
              { applicationNo: { contains: search } },
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { companyName: { contains: search } },
              { user: { email: { contains: search } } },
            ],
          }
        : {}),
    };
    const [total, apps] = await Promise.all([
      prisma.partnerApplication.count({ where }),
      prisma.partnerApplication.findMany({
        where,
        include: { user: { select: { id: true, email: true, accountStatus: true, role: true } } },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    ok(res, {
      total,
      page,
      pageSize,
      items: apps.map((a) => ({
        ...decryptApplication(a),
        email: a.user.email,
        accountStatus: a.user.accountStatus,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function applicationDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const app = await prisma.partnerApplication.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, accountStatus: true, role: true, lastLoginAt: true } },
        reviewLogs: { orderBy: { reviewTime: 'asc' } },
      },
    });
    if (!app) throw notFound('Application not found');
    const licences = await prisma.licence.findMany({ where: { userId: app.userId } });
    ok(res, {
      ...decryptApplication(app),
      email: app.user.email,
      accountStatus: app.user.accountStatus,
      licences: licences.map((l) => ({
        ...l,
        licenceNumber: safeDecrypt(l.licenceNumber, SALT_LICENCE),
        fileUrl: l.filePath ? `/uploads/${path.relative(path.resolve('../uploads'), l.filePath).replace(/\\/g, '/')}` : null,
      })),
      reviewLogs: app.reviewLogs,
    });
  } catch (err) {
    next(err);
  }
}

export async function reviewApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const admin = { id: req.auth!.uid, email: '' };
    const body = req.body as {
      action: 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO' | 'FREEZE';
      role?: UserRole;
      reason?: string;
      requestedInfo?: string;
      abnAction?: 'VERIFY_ABR' | 'VERIFY_MANUAL' | 'REJECT_ABN';
      abnNote?: string;
    };
    const app = await prisma.partnerApplication.findUnique({ where: { id } });
    if (!app) throw notFound('Application not found');

    switch (body.action) {
      case 'APPROVE': {
        const role = body.role ?? (app.tradeType !== 'NOT_APPLICABLE' ? UserRole.LICENSED_TRADESMAN : UserRole.SUB_DEALER);
        if (!['REGIONAL_AGENT', 'LICENSED_TRADESMAN', 'SUB_DEALER', 'WATERWORKER', 'BUILDER'].includes(role)) {
          throw badRequest('A valid member role is required for approval');
        }
        if (role === 'WATERWORKER' || role === 'BUILDER') {
          const verification = await verifyAbn(id, admin.id, ipOf(req));
          if (!verification.configured || !verification.success) {
            throw badRequest(`ABR verification required: ${verification.message}`);
          }
        }
        const r = await approveApplication(id, admin, role, body.reason ?? 'Approved', ipOf(req));
        ok(res, r, 'Application approved');
        return;
      }
      case 'REJECT': {
        if (!body.reason) throw badRequest('Reject reason is required');
        await rejectApplication(id, admin, body.reason, ipOf(req));
        ok(res, null, 'Application rejected');
        return;
      }
      case 'REQUEST_MORE_INFO': {
        if (!body.requestedInfo) throw badRequest('Please describe what information is needed');
        await requestMoreInfo(id, admin, body.requestedInfo, ipOf(req));
        ok(res, null, 'More information requested');
        return;
      }
      case 'FREEZE': {
        await freezeMember(app.userId, admin.id, body.reason ?? 'Frozen by admin', ipOf(req));
        ok(res, null, 'Member frozen');
        return;
      }
      default:
        throw badRequest('Invalid action');
    }
  } catch (err) {
    next(err);
  }
}

export async function abnCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body as { action: 'VERIFY_ABR' | 'VERIFY_MANUAL' | 'REJECT_ABN'; note?: string };
    const app = await prisma.partnerApplication.findUnique({ where: { id } });
    if (!app) throw notFound('Application not found');
    const adminId = req.auth!.uid;

    if (body.action === 'VERIFY_ABR') {
      const result = await verifyAbn(id, adminId, ipOf(req));
      if (!result.configured || !result.success) {
        throw badRequest(`ABR verification failed: ${result.message}`);
      }
      ok(res, result, result.message);
      return;
    }
    if (body.action === 'VERIFY_MANUAL') {
      await recordManualAbnVerification(id, adminId, 'VERIFIED', body.note ?? 'Manually verified', ipOf(req));
      ok(res, null, 'ABN marked as manually verified');
      return;
    }
    if (body.action === 'REJECT_ABN') {
      await recordManualAbnVerification(id, adminId, 'FAILED', body.note ?? 'ABN verification failed', ipOf(req));
      ok(res, null, 'ABN marked as failed');
      return;
    }
    throw badRequest('Invalid action');
  } catch (err) {
    next(err);
  }
}

export async function listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = req.query.search as string | undefined;
    const role = req.query.role as string | undefined;
    const state = req.query.state as string | undefined;
    const status = req.query.status as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) ?? '20', 10) || 20));

    const where = {
      role: { not: 'ADMIN' as const },
      ...(role ? { role: role as UserRole } : {}),
      ...(status ? { accountStatus: status as never } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search } },
              { memberId: { aurId: { contains: search } } },
              { memberProfile: { companyName: { contains: search } } },
              { memberProfile: { firstName: { contains: search } } },
              { memberProfile: { lastName: { contains: search } } },
            ],
          }
        : {}),
      ...(state ? { memberProfile: { state } } : {}),
    };
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { memberId: true, memberProfile: true, application: { select: { abnStatus: true, tradeType: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    ok(res, {
      total,
      page,
      pageSize,
      items: users.map((u) => ({
        id: u.id,
        memberId: u.memberId?.aurId ?? null,
        email: u.email,
        contactName: u.memberProfile ? `${u.memberProfile.firstName} ${u.memberProfile.lastName}` : null,
        companyName: u.memberProfile?.companyName ?? null,
        phone: safeDecrypt(u.memberProfile?.phone, SALT_PHONE),
        abnStatus: u.application?.abnStatus ?? null,
        tradeType: u.application?.tradeType ?? null,
        role: u.role,
        state: u.memberProfile?.state ?? null,
        region: u.memberProfile?.region ?? null,
        registeredAt: u.createdAt,
        accountStatus: u.accountStatus,
        totalSales: u.memberProfile?.totalSales ?? 0,
        totalOrders: u.memberProfile?.totalOrders ?? 0,
        monthSales: u.memberProfile?.monthSales ?? 0,
        yearSales: u.memberProfile?.yearSales ?? 0,
        lastOrderAt: u.memberProfile?.lastOrderAt ?? null,
        lastLoginAt: u.lastLoginAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function memberDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        memberId: true,
        memberProfile: true,
        application: true,
        licences: true,
      },
    });
    if (!user) throw notFound('Member not found');
    const { passwordHash: _ph, ...safeUser } = user;
    void _ph;
    ok(res, {
      ...safeUser,
      profile: user.memberProfile,
      application: user.application
        ? decryptApplication(user.application as never)
        : null,
      licences: user.licences.map((l) => ({
        ...l,
        licenceNumber: safeDecrypt(l.licenceNumber, SALT_LICENCE),
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function setMemberStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body as { action: 'FREEZE' | 'UNFREEZE' | 'SUSPEND'; reason?: string };
    const adminId = req.auth!.uid;
    if (body.action === 'FREEZE') {
      await freezeMember(id, adminId, body.reason ?? 'Frozen by admin', ipOf(req));
      ok(res, null, 'Member frozen');
      return;
    }
    if (body.action === 'UNFREEZE') {
      await unfreezeMember(id, adminId, ipOf(req));
      ok(res, null, 'Member unfrozen');
      return;
    }
    if (body.action === 'SUSPEND') {
      await prisma.user.update({ where: { id }, data: { accountStatus: 'SUSPENDED' } });
      await audit({ userId: adminId, action: 'MEMBER_FROZEN', targetType: 'Member', targetId: String(id), details: { reason: body.reason }, ip: ipOf(req) });
      ok(res, null, 'Member suspended');
      return;
    }
    throw badRequest('Invalid action');
  } catch (err) {
    next(err);
  }
}

export async function changeMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body as { role: UserRole; reason: string };
    if (!['REGIONAL_AGENT', 'LICENSED_TRADESMAN', 'SUB_DEALER', 'WATERWORKER', 'BUILDER'].includes(body.role)) {
      throw badRequest('Invalid role');
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw notFound('Member not found');
    const oldRole = user.role;
    const level =
      body.role === 'REGIONAL_AGENT' ? 1 :
      body.role === 'LICENSED_TRADESMAN' ? 2 :
      body.role === 'SUB_DEALER' ? 3 :
      body.role === 'WATERWORKER' ? 4 :
      5;
    await prisma.user.update({ where: { id }, data: { role: body.role, memberLevel: level } });
    await audit({
      userId: req.auth!.uid,
      action: 'ROLE_CHANGED',
      targetType: 'Member',
      targetId: String(id),
      details: { from: oldRole, to: body.role, reason: body.reason },
      ip: ipOf(req),
    });
    ok(res, null, 'Role updated');
  } catch (err) {
    next(err);
  }
}

export async function exportMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { buildExcelBuffer } = await import('../services/exportService');
    const role = req.query.role as string | undefined;
    const state = req.query.state as string | undefined;
    const status = req.query.status as string | undefined;
    const users = await prisma.user.findMany({
      where: {
        role: { not: 'ADMIN' },
        ...(role ? { role: role as UserRole } : {}),
        ...(status ? { accountStatus: status as never } : {}),
        ...(state ? { memberProfile: { state } } : {}),
      },
      include: { memberId: true, memberProfile: true },
      orderBy: { createdAt: 'desc' },
    });
    const rows = users.map((u) => ({
      memberId: u.memberId?.aurId ?? '',
      email: u.email,
      contactName: u.memberProfile ? `${u.memberProfile.firstName} ${u.memberProfile.lastName}` : '',
      companyName: u.memberProfile?.companyName ?? '',
      phone: safeDecrypt(u.memberProfile?.phone, SALT_PHONE),
      role: u.role,
      state: u.memberProfile?.state ?? '',
      region: u.memberProfile?.region ?? '',
      registrationDate: u.createdAt.toISOString().slice(0, 10),
      accountStatus: u.accountStatus,
      totalSales: u.memberProfile?.totalSales ?? 0,
      totalOrders: u.memberProfile?.totalOrders ?? 0,
      monthSales: u.memberProfile?.monthSales ?? 0,
      yearSales: u.memberProfile?.yearSales ?? 0,
      lastOrderDate: u.memberProfile?.lastOrderAt?.toISOString().slice(0, 10) ?? '',
    }));
    const buf = buildExcelBuffer(
      'Members',
      [
        { header: 'Member ID', key: 'memberId' },
        { header: 'Email', key: 'email' },
        { header: 'Contact Name', key: 'contactName' },
        { header: 'Company Name', key: 'companyName' },
        { header: 'Phone', key: 'phone' },
        { header: 'Role', key: 'role' },
        { header: 'State', key: 'state' },
        { header: 'Region', key: 'region' },
        { header: 'Registration Date', key: 'registrationDate' },
        { header: 'Account Status', key: 'accountStatus' },
        { header: 'Total Sales', key: 'totalSales' },
        { header: 'Total Orders', key: 'totalOrders' },
        { header: 'Month Sales', key: 'monthSales' },
        { header: 'Year Sales', key: 'yearSales' },
        { header: 'Last Order Date', key: 'lastOrderDate' },
      ],
      rows,
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="aurius-members.xlsx"');
    res.send(buf);
  } catch (err) {
    next(err);
  }
}
