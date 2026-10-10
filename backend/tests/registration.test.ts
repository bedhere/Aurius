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
});
