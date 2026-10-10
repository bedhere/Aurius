import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Express } from 'express';
import request from 'supertest';
import { buildApp, prisma, validApplication, createUser, loginAgent, seedProduct } from './helpers';

describe('Approval & member IDs (requirement 90 - review tests)', () => {
  let app: Express;

  beforeAll(async () => {
    app = buildApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function registerAndApprove(role: 'REGIONAL_AGENT' | 'LICENSED_TRADESMAN' | 'SUB_DEALER') {
    const channel = role === 'LICENSED_TRADESMAN' ? 'VIP' : 'TRADE';
    const data = validApplication({
      channel,
      tradeType: role === 'LICENSED_TRADESMAN' ? 'LICENSED_PLUMPER' : 'NOT_APPLICABLE',
      licenceNumber: role === 'LICENSED_TRADESMAN' ? 'PLB-12345' : undefined,
      licenceType: role === 'LICENSED_TRADESMAN' ? 'INDIVIDUAL' : undefined,
    });
    await request(app).post('/api/applications').send(data);
    const adminId = await createUser(`admin${Date.now()}${Math.floor(Math.random() * 9999)}@test.com.au`, 'ADMIN');
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    const applicant = await prisma.user.findUnique({ where: { email: data.email as string } });
    const application = await prisma.partnerApplication.findUnique({ where: { userId: applicant!.id } });
    const adminAgent = await loginAgent(app, admin!.email);
    const res = await request(app)
      .post(`/api/admin/applications/${application!.id}/review`)
      .set('Authorization', `Bearer ${adminAgent.token}`)
      .send({ action: 'APPROVE', role });
    expect(res.status).toBe(200);
    return { email: data.email as string, aurId: res.body.data.aurId as string, userId: applicant!.id };
  }

  it('pending users cannot see prices', async () => {
    const productId = await seedProduct(app);
    const email = `pending${Date.now()}@test.com.au`;
    const userId = await createUser(email, 'SUB_DEALER', 'PENDING_REVIEW');
    const agent = await loginAgent(app, email);
    void userId;
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${agent.token}`);
    const item = (res.body.data.items as { id: number; price: unknown; priceNote: string }[]).find((i) => i.id === productId);
    expect(item?.price).toBeNull();
    expect(item?.priceNote).toBe('Your application is under review.');
  });

  it('approval generates a unique AUR-TR ID for tradesmen', async () => {
    const { aurId } = await registerAndApprove('LICENSED_TRADESMAN');
    expect(aurId).toMatch(/^AUR-TR-\d{4}\d{6}$/);
  });

  it('approval generates a unique AUR-DE ID for agents', async () => {
    const { aurId } = await registerAndApprove('REGIONAL_AGENT');
    expect(aurId).toMatch(/^AUR-DE-\d{4}\d{6}$/);
  });

  it('approval generates a unique AUR-SD ID for sub-dealers', async () => {
    const { aurId } = await registerAndApprove('SUB_DEALER');
    expect(aurId).toMatch(/^AUR-SD-\d{4}\d{6}$/);
  });

  it('re-approving an approved application returns a clear conflict', async () => {
    const data = validApplication({
      channel: 'TRADE',
      tradeType: 'NOT_APPLICABLE',
      licenceType: undefined,
      licenceNumber: undefined,
    });
    await request(app).post('/api/applications').send(data);
    const adminId = await createUser(`adminrepeat${Date.now()}@test.com.au`, 'ADMIN');
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    const applicant = await prisma.user.findUnique({ where: { email: data.email as string } });
    const application = await prisma.partnerApplication.findUnique({ where: { userId: applicant!.id } });
    const adminAgent = await loginAgent(app, admin!.email);
    const endpoint = `/api/admin/applications/${application!.id}/review`;

    const firstApproval = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${adminAgent.token}`)
      .send({ action: 'APPROVE', role: 'SUB_DEALER' });
    expect(firstApproval.status).toBe(200);

    const repeatedApproval = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${adminAgent.token}`)
      .send({ action: 'APPROVE', role: 'SUB_DEALER' });

    expect(repeatedApproval.status).toBe(409);
    expect(repeatedApproval.body.message).toBe('Application already approved');
  });

  it('AUR IDs are never duplicated', async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const { aurId } = await registerAndApprove('SUB_DEALER');
      ids.add(aurId);
    }
    expect(ids.size).toBe(5);
  });

  it('rejecting an application allows re-submission', async () => {
    const data = validApplication();
    await request(app).post('/api/applications').send(data);
    const adminId = await createUser(`adminr${Date.now()}@test.com.au`, 'ADMIN');
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    const applicant = await prisma.user.findUnique({ where: { email: data.email as string } });
    const application = await prisma.partnerApplication.findUnique({ where: { userId: applicant!.id } });
    const adminAgent = await loginAgent(app, admin!.email);

    const reject = await request(app)
      .post(`/api/admin/applications/${application!.id}/review`)
      .set('Authorization', `Bearer ${adminAgent.token}`)
      .send({ action: 'REJECT', reason: 'ABN could not be verified' });
    expect(reject.status).toBe(200);

    const applicantAgent = await loginAgent(app, data.email as string, 'Test@1234');
    const resubmit = await request(app)
      .post('/api/applications/resubmit')
      .set('Authorization', `Bearer ${applicantAgent.token}`)
      .send({
        ...data,
        abnNumber: '51824753557',
      });
    expect(resubmit.status).toBe(200);

    const updated = await prisma.partnerApplication.findUnique({ where: { userId: applicant!.id } });
    expect(updated?.status).toBe('SUBMITTED');
    expect(updated?.resubmittedAt).not.toBeNull();
    // original record preserved with history
    const logs = await prisma.applicationReviewLog.count({ where: { applicationId: application!.id } });
    expect(logs).toBe(1);
  });

  it('every review action writes a review log', async () => {
    const data = validApplication();
    await request(app).post('/api/applications').send(data);
    const adminId = await createUser(`adminlog${Date.now()}@test.com.au`, 'ADMIN');
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    const applicant = await prisma.user.findUnique({ where: { email: data.email as string } });
    const application = await prisma.partnerApplication.findUnique({ where: { userId: applicant!.id } });
    const adminAgent = await loginAgent(app, admin!.email);

    await request(app)
      .post(`/api/admin/applications/${application!.id}/review`)
      .set('Authorization', `Bearer ${adminAgent.token}`)
      .send({ action: 'REQUEST_MORE_INFO', requestedInfo: 'Please upload your ABN certificate' });
    await request(app)
      .post(`/api/admin/applications/${application!.id}/review`)
      .set('Authorization', `Bearer ${adminAgent.token}`)
      .send({ action: 'APPROVE', role: 'SUB_DEALER' });

    const logs = await prisma.applicationReviewLog.findMany({ where: { applicationId: application!.id } });
    expect(logs.length).toBe(2);
    expect(logs[0].action).toBe('REQUEST_MORE_INFO');
    expect(logs[1].action).toBe('APPROVE');
  });
});
