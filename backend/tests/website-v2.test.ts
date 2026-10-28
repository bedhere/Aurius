import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { buildApp, createUser, loginAgent, prisma, seedProduct } from './helpers';
import { config } from '../src/config';
import { getUnitPriceForLevel } from '../src/services/priceService';
import * as mail from '../src/services/mailService';

describe('Website v2 publication and enquiry frameworks', () => {
  const app = buildApp();
  let auth: string;
  let productId: number;
  const originalMode = config.tradePricingMode;
  beforeAll(async () => {
    const email = `v2-admin-${Date.now()}@example.com.au`;
    await createUser(email, 'ADMIN');
    auth = `Bearer ${(await loginAgent(app, email)).token}`;
    productId = await seedProduct(app);
  });
  afterAll(async () => { config.tradePricingMode = originalMode; await prisma.$disconnect(); });

  it('keeps a resource draft private and refuses publication without real files', async () => {
    const draft = await request(app).post('/api/admin/resources').set('Authorization', auth)
      .field('title', 'Pending product manual').field('category', 'PRODUCT_MANUAL').field('productId', String(productId));
    expect(draft.status).toBe(200);
    const id = draft.body.data.id;
    expect(draft.body.data).toMatchObject({ published: false, hasFile: false });
    expect((await request(app).get('/api/support/resources')).body.data.some((item: { id: number }) => item.id === id)).toBe(false);
    expect((await request(app).get(`/api/support/resources/${id}/file`)).status).toBe(404);
    expect((await request(app).put(`/api/admin/resources/${id}`).set('Authorization', auth).send({ published: true })).status).toBe(400);
    expect((await request(app).get('/api/admin/resources')).status).toBe(401);
  });

  it('requires model, certificate number and actual scope before publishing WaterMark material', async () => {
    const invalid = await request(app).post('/api/admin/resources').set('Authorization', auth)
      .field('title', 'Certificate').field('category', 'WATERMARK_CERTIFICATE').field('published', 'true')
      .attach('file', Buffer.from('%PDF-1.4\nTest certificate'), { filename: 'certificate.pdf', contentType: 'application/pdf' });
    expect(invalid.status).toBe(400);
    const valid = await request(app).post('/api/admin/resources').set('Authorization', auth)
      .field('title', 'Verified test certificate').field('category', 'WATERMARK_CERTIFICATE').field('published', 'true')
      .field('productId', String(productId)).field('certificateNumber', 'TEST-ONLY-CERT').field('certificationScope', 'Test product model T1 only')
      .attach('file', Buffer.from('%PDF-1.4\nTest certificate'), { filename: 'certificate.pdf', contentType: 'application/pdf' });
    expect(valid.status).toBe(200);
    const id = valid.body.data.id;
    const listing = await request(app).get(`/api/support/resources?productId=${productId}`);
    expect(listing.body.data.find((item: { id: number }) => item.id === id)).toMatchObject({ certificateNumber: 'TEST-ONLY-CERT', product: { id: productId } });
    expect(JSON.stringify(listing.body)).not.toContain('filePath');
    expect((await request(app).get(`/api/support/resources/${id}/file`)).headers['content-type']).toContain('application/pdf');
    await request(app).put(`/api/admin/resources/${id}`).set('Authorization', auth).send({ published: false });
    expect((await request(app).get(`/api/support/resources/${id}/file`)).status).toBe(404);
  });

  it.each([
    ['INSTALLATION_VIDEO', 'mp4', 'video/mp4'],
    ['INSTALLATION_VIDEO', 'webm', 'video/webm'],
    ['PRODUCT_FEATURE_VIDEO', 'mp4', 'video/mp4'],
    ['PRODUCT_FEATURE_VIDEO', 'webm', 'video/webm'],
  ])('publishes model-linked %s (%s) and serves video ranges', async (category, extension, contentType) => {
    const video = await request(app).post('/api/admin/resources').set('Authorization', auth)
      .field('title', `${category} test`).field('category', category).field('productId', String(productId)).field('published', 'true')
      .attach('file', Buffer.from('test video fixture'), { filename: `video.${extension}`, contentType });
    expect(video.status).toBe(200);
    const id = video.body.data.id;
    const listing = await request(app).get(`/api/support/resources?productId=${productId}`);
    expect(listing.body.data.find((item: { id: number }) => item.id === id)).toMatchObject({ category, product: { id: productId } });
    const response = await request(app).get(video.body.data.fileUrl).set('Range', 'bytes=0-3');
    expect(response.status).toBe(206);
    expect(response.headers['content-type']).toContain(contentType);
    expect(response.headers['content-range']).toBe('bytes 0-3/18');
    const otherProductId = await seedProduct(app);
    const otherListing = await request(app).get(`/api/support/resources?productId=${otherProductId}`);
    expect(otherListing.body.data.some((item: { id: number }) => item.id === id)).toBe(false);
    await request(app).put(`/api/admin/resources/${id}`).set('Authorization', auth).send({ published: false });
    expect((await request(app).get(video.body.data.fileUrl)).status).toBe(404);
  });

  it.each([
    ['PRODUCT_FEATURE_VIDEO', 'manual.pdf', 'application/pdf'],
    ['INSTALLATION_VIDEO', 'manual.pdf', 'application/pdf'],
    ['PRODUCT_MANUAL', 'feature.mp4', 'video/mp4'],
  ])('rejects publication of %s with a mismatched file', async (category, filename, contentType) => {
    const response = await request(app).post('/api/admin/resources').set('Authorization', auth)
      .field('title', 'Mismatched resource').field('category', category).field('productId', String(productId)).field('published', 'true')
      .attach('file', Buffer.from('test file fixture'), { filename, contentType });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Choose a file that matches the resource category');
  });

  it('reclassifies an existing installation video as a feature video without re-uploading', async () => {
    const original = await request(app).post('/api/admin/resources').set('Authorization', auth)
      .field('title', 'Existing feature demonstration').field('category', 'INSTALLATION_VIDEO').field('productId', String(productId)).field('published', 'true')
      .attach('file', Buffer.from('test video fixture'), { filename: 'existing.mp4', contentType: 'video/mp4' });
    expect(original.status).toBe(200);
    const id = original.body.data.id;
    const changed = await request(app).post(`/api/admin/resources/${id}`).set('Authorization', auth)
      .field('category', 'PRODUCT_FEATURE_VIDEO');
    expect(changed.status).toBe(200);
    expect(changed.body.data).toMatchObject({ category: 'PRODUCT_FEATURE_VIDEO', originalName: 'existing.mp4', hasFile: true, published: true });
    expect((await request(app).get(original.body.data.fileUrl)).status).toBe(200);
    await request(app).put(`/api/admin/resources/${id}`).set('Authorization', auth).send({ published: false });
    expect((await request(app).put(`/api/admin/resources/${id}`).set('Authorization', auth).send({ published: true })).status).toBe(200);
    const listing = await request(app).get(`/api/support/resources?productId=${productId}`);
    expect(listing.body.data.find((item: { id: number }) => item.id === id)).toMatchObject({ category: 'PRODUCT_FEATURE_VIDEO', originalName: 'existing.mp4' });
  });

  it('only publicly lists enabled, formally authorised regional distributors', async () => {
    const base = { name: 'Test location', address: 'Test only', state: 'QLD', latitude: -27.4, longitude: 153.0 };
    for (const fields of [{ authorised: false, partnerType: 'REGIONAL_DISTRIBUTOR' }, { authorised: true, partnerType: 'DEALER' }, { authorised: true, partnerType: 'REGIONAL_DISTRIBUTOR' }]) {
      await request(app).post('/api/admin/dealers').set('Authorization', auth).send({ ...base, ...fields });
    }
    const locations = (await request(app).get('/api/dealers')).body.data.filter((item: { name: string }) => item.name === base.name);
    expect(locations).toHaveLength(1);
    expect(locations[0]).toMatchObject({ authorised: true, partnerType: 'REGIONAL_DISTRIBUTOR' });
  });

  it('saves partnership fields securely, categorises both channels and sends confirmation without creating an account', async () => {
    const users = await prisma.user.count();
    const data = { companyName: 'V2 Applicant', abn: '51824753556', partnershipType: 'Regional Distributor', yearsInBusiness: '12',
      existingSalesNetwork: '2 stores, 10 plumbers', currentAnnualSales: '200 units per year', expectedAnnualSales: '100 units per year',
      state: 'VIC', city: 'Melbourne', businessOverview: 'Plumbing showroom', interestedProducts: ['Smart Toilets', 'Whole House Water Filtration'],
      intendedTerritory: 'Melbourne', contactName: 'Sample Person', phone: '0411111111', email: 'v2-partner@example.com.au' };
    const response = await request(app).post('/api/partnership-enquiries').send(data);
    expect(response.status).toBe(200);
    expect(await prisma.user.count()).toBe(users);
    const record = await prisma.websiteEnquiry.findUniqueOrThrow({ where: { reference: response.body.data.reference } });
    expect(record).toMatchObject({ kind: 'PARTNERSHIP', category: 'Smart Bathroom, Water Filtration', status: 'NEW', notificationSent: true, confirmationSent: true });
    expect(record.data).not.toContain(data.abn);
    const records = await request(app).get('/api/admin/enquiries?kind=PARTNERSHIP&state=VIC&category=Water%20Filtration').set('Authorization', auth);
    expect(records.body.data.find((item: { id: number }) => item.id === record.id).data).toMatchObject({ abn: data.abn, currentAnnualSales: data.currentAnnualSales });
    expect(await prisma.emailLog.findFirst({ where: { recipient: data.email, template: 'ENQUIRY_CONFIRMATION' } })).not.toBeNull();
  });

  it('records contact categories and allows staff review without opening purchasing accounts', async () => {
    const response = await request(app).post('/api/contact').send({ name: 'V2 Customer', email: 'v2-contact@example.com.au', phone: '0411111111', state: 'NSW', enquiryType: 'Product Enquiries', message: 'Please help choose a model.' });
    expect(response.status).toBe(200);
    const record = await prisma.websiteEnquiry.findUniqueOrThrow({ where: { reference: response.body.data.reference } });
    expect(record.category).toBe('Product Enquiries');
    expect((await request(app).put(`/api/admin/enquiries/${record.id}`).set('Authorization', auth).send({ status: 'CONTACTED', notes: 'Reply prepared' })).status).toBe(200);
    expect((await request(app).get('/api/admin/enquiries')).status).toBe(401);
  });

  it('saves support requests and keeps purchase evidence private', async () => {
    const response = await request(app).post('/api/support/requests')
      .field('name', 'Support Customer').field('email', 'v2-support@example.com.au').field('phone', '0411111111')
      .field('productModel', 'T1').field('purchaseDate', '2026-01-01').field('message', 'Test fault details')
      .attach('proof', Buffer.from('%PDF-1.4\nPurchase evidence'), { filename: 'receipt.pdf', contentType: 'application/pdf' });
    expect(response.status).toBe(200);
    const record = await prisma.websiteEnquiry.findUniqueOrThrow({ where: { reference: response.body.data.reference } });
    const attachment = JSON.parse(record.attachments)[0];
    expect((await request(app).get(`/uploads/support/${attachment.path.split(/[\\/]/).pop()}`)).status).toBe(404);
    expect((await request(app).get(`/api/admin/enquiries/${record.id}/attachments/0`)).status).toBe(401);
    expect((await request(app).get(`/api/admin/enquiries/${record.id}/attachments/0`).set('Authorization', auth)).headers['content-type']).toContain('application/pdf');
    expect((await request(app).post('/api/support/requests').field('name', 'Missing evidence').field('email', 'test@example.com.au').field('phone', '0411111111').field('productModel', 'T1').field('purchaseDate', '2026-01-01').field('message', 'Fault')).status).toBe(400);
  });

  it('keeps unconfigured role prices empty and prevents purchasing with another role price', async () => {
    config.tradePricingMode = 'role';
    await prisma.productPrice.update({ where: { productId }, data: { retailPrice: 299, dealer1Price: null, distributor2Price: 110, waterworkerPrice: null, builderPrice: 150 } });
    for (const [role, expected] of [['BUILDER', 150], ['SUB_DEALER', 110], ['LICENSED_TRADESMAN', null], ['WATERWORKER', null], ['REGIONAL_AGENT', null]] as const) {
      const email = `v2-${role.toLowerCase()}-${Date.now()}@example.com.au`;
      await createUser(email, role);
      const token = `Bearer ${(await loginAgent(app, email)).token}`;
      const detail = (await request(app).get(`/api/products/${productId}`).set('Authorization', token)).body.data;
      expect(detail.prices.member).toBe(expected);
      expect(detail.prices.retail).toBeNull();
      expect(detail.price?.value ?? null).toBe(expected);
      if (expected === null) expect((await request(app).post('/api/cart').set('Authorization', token).send({ productId, quantity: 1 })).status).toBe(400);
    }
    await expect(getUnitPriceForLevel(productId, 4)).rejects.toThrow('Price available on enquiry');
    const visitor = (await request(app).get(`/api/products/${productId}`)).body.data;
    expect(visitor.price.value).toBe(299);
    expect(visitor.prices.member).toBeNull();
    expect((await request(app).put(`/api/admin/products/${productId}`).set('Authorization', auth).send({ builderPrice: null })).status).toBe(200);
    expect((await prisma.productPrice.findUniqueOrThrow({ where: { productId } })).builderPrice).toBeNull();
    await expect(getUnitPriceForLevel(productId, 5)).rejects.toThrow('Price available on enquiry');
    config.tradePricingMode = originalMode;
  });

  it('generates a password reset email and accepts its link only once', async () => {
    const email = `v2-password-${Date.now()}@example.com.au`;
    await createUser(email, 'BUILDER');
    let resetUrl = '';
    const originalSend = mail.sendMail;
    const spy = vi.spyOn(mail, 'sendMail').mockImplementation(async (input) => {
      if (input.template === 'PASSWORD_RESET') resetUrl = String(input.data.resetUrl);
      return originalSend(input);
    });
    try {
      expect((await request(app).post('/api/auth/forgot-password').send({ email })).status).toBe(200);
      expect(resetUrl).toContain('/reset-password?token=');
      const token = new URL(resetUrl).searchParams.get('token');
      const body = { token, password: 'NewPassword@1234', confirmPassword: 'NewPassword@1234' };
      expect((await request(app).post('/api/auth/reset-password').send(body)).status).toBe(200);
      expect((await request(app).post('/api/auth/reset-password').send(body)).status).toBe(400);
      expect((await loginAgent(app, email, body.password)).token).toBeTruthy();
    } finally { spy.mockRestore(); }
  });
});
