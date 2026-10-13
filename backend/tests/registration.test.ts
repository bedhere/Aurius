import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Express } from 'express';
import request from 'supertest';
import { buildApp, prisma, validApplication, createUser, loginAgent } from './helpers';

describe('Registration (requirement 90 - registration tests)', () => {
  let app: Express;

  beforeAll(async () => {
    app = buildApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects duplicate email', async () => {
    const data = validApplication();
    const first = await request(app).post('/api/applications').send(data);
    expect(first.status).toBe(201);
    const second = await request(app).post('/api/applications').send(data);
    expect(second.status).toBe(400);
    expect(second.body.message).toContain('already exists');
  });

  it('rejects a password that does not meet the policy', async () => {
    const data = validApplication({ password: 'weakpass', confirmPassword: 'weakpass' });
    const res = await request(app).post('/api/applications').send(data);
    expect(res.status).toBe(400);
  });

  it('rejects a password with no special character', async () => {
    const data = validApplication({ password: 'NoSpecial1', confirmPassword: 'NoSpecial1' });
    const res = await request(app).post('/api/applications').send(data);
    expect(res.status).toBe(400);
  });

  it('rejects missing privacy consent', async () => {
    const data = validApplication({ privacyConsent: false });
    const res = await request(app).post('/api/applications').send(data);
    expect(res.status).toBe(400);
  });

  it('rejects missing dealer agreement', async () => {
    const data = validApplication({ dealerAgreement: false });
    const res = await request(app).post('/api/applications').send(data);
    expect(res.status).toBe(400);
  });

  it('rejects an invalid ABN (not 11 digits)', async () => {
    const data = validApplication({ abnNumber: '12345' });
    const res = await request(app).post('/api/applications').send(data);
    expect(res.status).toBe(400);
  });

  it('rejects a licence file with a forged extension', async () => {
    const data = validApplication();
    const created = await request(app).post('/api/applications').send(data);
    expect(created.status).toBe(201);
    const user = await prisma.user.findUnique({ where: { email: data.email as string } });
    const agent = await loginAgent(app, data.email as string, 'Test@1234');
    // Forge: content is text but named .jpg with image MIME... multer only
    // checks extension + declared MIME. A fake extension (.exe) must fail.
    const bad = await request(app)
      .post('/api/applications/me/licence-file')
      .set('Authorization', `Bearer ${agent.token}`)
      .attach('file', Buffer.from('MZ fake executable'), { filename: 'licence.exe', contentType: 'application/octet-stream' });
    expect(bad.status).toBe(400);
    void user;
  });

  it('accepts a valid licence PDF upload', async () => {
    const data = validApplication({ email: `pdfupload${Date.now()}@test.com.au` });
    const created = await request(app).post('/api/applications').send(data);
    expect(created.status).toBe(201);
    const agent = await loginAgent(app, data.email as string, 'Test@1234');
    const pdfBytes = Buffer.from('%PDF-1.4 test content');
    const res = await request(app)
      .post('/api/applications/me/licence-file')
      .set('Authorization', `Bearer ${agent.token}`)
      .attach('file', pdfBytes, { filename: 'licence.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
  });

  it('stores the new account as PENDING_REVIEW', async () => {
    const data = validApplication();
    await request(app).post('/api/applications').send(data);
    const user = await prisma.user.findUnique({ where: { email: data.email as string } });
    expect(user?.accountStatus).toBe('PENDING_REVIEW');
  });

  it('records regional distributor intent without granting an agent role', async () => {
    const data = validApplication({ channel: 'TRADE', tradeType: 'NOT_APPLICABLE', licenceType: null,
      licenceNumber: null, smartToiletExp: null, waterPurifExp: null,
      partnershipType: 'REGIONAL_DISTRIBUTOR', intendedTerritory: '  Greater Sydney, NSW  ' });
    const res = await request(app).post('/api/applications').send(data);
    expect(res.status).toBe(201);
    const record = await prisma.partnerApplication.findUnique({ where: { applicationNo: res.body.data.applicationNo }, include: { user: true } });
    expect(record?.partnershipType).toBe('REGIONAL_DISTRIBUTOR');
    expect(record?.intendedTerritory).toBe('Greater Sydney, NSW');
    expect(record?.user.accountStatus).toBe('PENDING_REVIEW');
    expect(record?.user.role).toBe('SUB_DEALER');

    const adminEmail = `regional-review-${Date.now()}@test.com.au`;
    await createUser(adminEmail, 'ADMIN');
    const auth = await loginAgent(app, adminEmail, 'Test@1234');
    const list = await request(app).get('/api/admin/applications?partnershipType=REGIONAL_DISTRIBUTOR')
      .set('Authorization', `Bearer ${auth.token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items.some((row: { applicationNo: string }) => row.applicationNo === res.body.data.applicationNo)).toBe(true);
    expect(list.body.data.items.every((row: { partnershipType: string }) => row.partnershipType === 'REGIONAL_DISTRIBUTOR')).toBe(true);

    await request(app).post(`/api/admin/applications/${record!.id}/review`)
      .set('Authorization', `Bearer ${auth.token}`)
      .send({ action: 'REQUEST_MORE_INFO', requestedInfo: 'Please clarify your proposed territory' });
    const applicant = await loginAgent(app, data.email as string);
    const invalidResubmit = await request(app).post('/api/applications/resubmit')
      .set('Authorization', `Bearer ${applicant.token}`).send({ ...data, intendedTerritory: null });
    expect(invalidResubmit.status).toBe(400);
    const updated = await request(app).post('/api/applications/resubmit')
      .set('Authorization', `Bearer ${applicant.token}`).send({ ...data, intendedTerritory: 'Newcastle, NSW' });
    expect(updated.status).toBe(200);
    const revised = await prisma.partnerApplication.findUnique({ where: { id: record!.id } });
    expect(revised?.intendedTerritory).toBe('Newcastle, NSW');
    expect(revised?.partnershipType).toBe('REGIONAL_DISTRIBUTOR');
  });

  it('requires a territory for regional distributors and rejects the VIP channel for this intent', async () => {
    const missingTerritory = validApplication({ channel: 'TRADE', partnershipType: 'REGIONAL_DISTRIBUTOR', intendedTerritory: '   ' });
    expect((await request(app).post('/api/applications').send(missingTerritory)).status).toBe(400);
    const wrongChannel = validApplication({ partnershipType: 'REGIONAL_DISTRIBUTOR', intendedTerritory: 'NSW' });
    expect((await request(app).post('/api/applications').send(wrongChannel)).status).toBe(400);
  });

  it('accepts other trade professionals without a licence and discards unrelated territory text', async () => {
    const data = validApplication({ channel: 'TRADE', tradeType: 'NOT_APPLICABLE', licenceType: null,
      licenceNumber: null, smartToiletExp: null, waterPurifExp: null,
      partnershipType: 'TRADE_PROFESSIONAL', intendedTerritory: 'NSW' });
    const res = await request(app).post('/api/applications').send(data);
    expect(res.status).toBe(201);
    const record = await prisma.partnerApplication.findUnique({ where: { applicationNo: res.body.data.applicationNo } });
    expect(record?.partnershipType).toBe('TRADE_PROFESSIONAL');
    expect(record?.intendedTerritory).toBeNull();
  });
});
