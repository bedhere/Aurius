import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { buildApp, createUser, loginAgent, prisma, seedProduct, validApplication } from './helpers';
import { config } from '../src/config';
import * as mailService from '../src/services/mailService';
import { templates } from '../src/mail/templates';
import { getPriceForProduct, getUnitPriceForLevel, getVisiblePriceForProduct } from '../src/services/priceService';
import { channelForRole } from '../src/services/memberService';
import { publicCompanyInfo } from '../src/lib/companyInfo';

const partnership = {
  abn: '51824753556', partnershipType: 'Regional Distributor',
  companyName: 'Revision Test Business', state: 'NSW', city: 'Sydney',
  businessOverview: 'Bathroom showroom selling toilets and filtration systems.',
  interestedProducts: ['Smart Toilets', 'Whole House Water Filtration'],
  intendedTerritory: 'Greater Sydney', expectedAnnualSales: '100 toilets and 50 filtration systems per year',
  contactName: 'Test Applicant', phone: '0411111111', website: 'www.example.com.au', email: 'partner-revision@example.com.au',
};

describe('Website enquiry and approved account revision', () => {
  const app = buildApp();
  const originalMode = config.tradePricingMode;
  beforeAll(() => { config.tradePricingMode = 'uniform'; });
  afterAll(async () => { config.tradePricingMode = originalMode; vi.restoreAllMocks(); await prisma.$disconnect(); });

  it('emails partnership details to the official inbox without creating any purchasing account', async () => {
    const usersBefore = await prisma.user.count();
    const applicationsBefore = await prisma.partnerApplication.count();
    const response = await request(app).post('/api/partnership-enquiries').send(partnership);
    expect(response.status).toBe(200);
    expect(await prisma.user.count()).toBe(usersBefore);
    expect(await prisma.partnerApplication.count()).toBe(applicationsBefore);
    const log = await prisma.emailLog.findFirst({ where: { template: 'PARTNERSHIP_ENQUIRY' }, orderBy: { id: 'desc' } });
    expect(log).toMatchObject({ recipient: 'info@aurius.com.au', status: 'DEV_LOGGED', userId: null });
    const template = templates.PARTNERSHIP_ENQUIRY({ ...partnership, interestedProducts: partnership.interestedProducts.join(', ') });
    for (const value of Object.values(partnership).flat()) expect(template.text).toContain(value);
  });

  it('validates partnership fields and rejects unsupported product categories', async () => {
    const before = await prisma.emailLog.count({ where: { template: 'PARTNERSHIP_ENQUIRY' } });
    for (const invalid of [
      { ...partnership, companyName: '   ' },
      { ...partnership, email: 'not-an-email' },
      { ...partnership, interestedProducts: ['Unlisted product'] },
      { ...partnership, state: 'INVALID' },
    ]) {
      expect((await request(app).post('/api/partnership-enquiries').send(invalid)).status).toBe(400);
    }
    expect(await prisma.emailLog.count({ where: { template: 'PARTNERSHIP_ENQUIRY' } })).toBe(before);
  });

  it('preserves a received enquiry and exposes notification failure when SMTP fails', async () => {
    const send = vi.spyOn(mailService, 'sendMail').mockResolvedValueOnce(false);
    try {
      const response = await request(app).post('/api/partnership-enquiries').send(partnership);
      expect(response.status).toBe(200);
      const record = await prisma.websiteEnquiry.findUniqueOrThrow({ where: { reference: response.body.data.reference } });
      expect(record.notificationSent).toBe(false);
      expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'info@aurius.com.au', replyTo: partnership.email }));
    } finally { send.mockRestore(); }
  });

  it('emails every contact field through a customer enquiry template to the same inbox', async () => {
    const response = await request(app).post('/api/contact').send({
      name: 'Test Customer', companyName: 'Test Company', email: 'contact@example.com.au', phone: '0411111111',
      state: 'VIC', enquiryType: 'Technical & After-Sales Support', message: 'Installation information requested.',
    });
    expect(response.status).toBe(200);
    const log = await prisma.emailLog.findFirst({ where: { template: 'CONTACT_ENQUIRY' }, orderBy: { id: 'desc' } });
    expect(log).toMatchObject({ recipient: 'info@aurius.com.au', subject: 'New Customer Enquiry — AURIUS Website', status: 'DEV_LOGGED' });
  });

  it('escapes submitted HTML while retaining the message in plain text', () => {
    const output = templates.CONTACT_ENQUIRY({ name: '<script>alert(1)</script>', message: '<img src=x onerror=alert(1)>\nLine two', email: 'test@example.com.au' });
    expect(output.html).not.toContain('<script>');
    expect(output.html).not.toContain('<img src=x');
    expect(output.html).toContain('&lt;img');
    expect(output.html).toContain('<br>Line two');
    expect(output.text).toContain('<img src=x');
  });

  it('hides development contact placeholders and preserves configured business contacts', () => {
    expect(publicCompanyInfo(null)).toMatchObject({ phone: '', address: '', email: 'info@aurius.com.au' });
    expect(publicCompanyInfo({ phone: '+61 2 8000 0000', address: 'Unit 8, 12-14 Orchard Road, Sydney NSW 2000, Australia', hours: 'Sample hours' })).toMatchObject({ phone: '', address: '', hours: '' });
    const configured = { phone: '+61 400 123 456', address: 'Configured business address', hours: 'Configured hours' };
    expect(publicCompanyInfo(configured)).toMatchObject(configured);
  });

  it('uses the common approved price for every partner role and for cart/order calculations', async () => {
    const productId = await seedProduct(app);
    await prisma.productPrice.update({ where: { productId }, data: { dealer1Price: 80, waterworkerPrice: 90, builderPrice: 95, distributor2Price: 110 } });
    const roles = ['REGIONAL_AGENT', 'LICENSED_TRADESMAN', 'SUB_DEALER', 'WATERWORKER', 'BUILDER'] as const;
    for (const [index, role] of roles.entries()) {
      expect((await getPriceForProduct(productId, { role, accountStatus: 'ACTIVE' })).price).toBe(120);
      expect((await getVisiblePriceForProduct(productId, role))?.member).toBe(120);
      expect(await getUnitPriceForLevel(productId, index + 1)).toBe(120);
    }
    const email = `revision-order-${Date.now()}@example.com.au`;
    const userId = await createUser(email, 'BUILDER');
    await prisma.memberId.create({ data: { userId, aurId: `AUR-BU-TEST-${userId}`, prefix: 'AUR-BU', year: 2026, sequence: userId } });
    const member = await loginAgent(app, email);
    const auth = `Bearer ${member.token}`;
    const detail = await request(app).get(`/api/products/${productId}`).set('Authorization', auth);
    expect(detail.body.data.prices).toMatchObject({ member: 120, memberLabel: 'Trade price', retail: null });
    expect((await request(app).post('/api/cart').set('Authorization', auth).send({ productId, quantity: 2 })).status).toBe(200);
    const cart = (await request(app).get('/api/cart').set('Authorization', auth)).body.data;
    expect(cart.subtotal).toBe(240);
    const order = await request(app).post('/api/orders').set('Authorization', auth).send({
      cartId: cart.id, shippingName: 'Test Builder', shippingPhone: '0411111111', shippingStreet: '1 Test St',
      shippingSuburb: 'Sydney', shippingState: 'NSW', shippingPostcode: '2000', shippingMethod: 'PICKUP',
    });
    expect(order.status).toBe(201);
    expect(order.body.data.total).toBe(240);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.body.data.orderId } })).status).toBe('PENDING_PAYMENT');
  });

  it('accepts builders in their own channel and keeps purchasing disabled until manual approval', async () => {
    const application = validApplication({ tradeType: 'BUILDER', smartToiletExp: null, waterPurifExp: null, partnershipType: 'TRADE_PROFESSIONAL' });
    const response = await request(app).post('/api/applications').send(application);
    expect(response.status).toBe(201);
    const userId = response.body.data.userId;
    expect(await prisma.user.findUnique({ where: { id: userId } })).toMatchObject({ role: 'BUILDER', accountStatus: 'PENDING_REVIEW' });
    const member = await loginAgent(app, application.email as string);
    expect((await request(app).get('/api/cart').set('Authorization', `Bearer ${member.token}`)).status).toBe(403);
    const adminEmail = `revision-admin-${Date.now()}@example.com.au`;
    await createUser(adminEmail, 'ADMIN');
    const admin = await loginAgent(app, adminEmail);
    const record = await prisma.partnerApplication.findUniqueOrThrow({ where: { userId } });
    const approved = await request(app).post(`/api/admin/applications/${record.id}/review`).set('Authorization', `Bearer ${admin.token}`).send({ action: 'APPROVE', role: 'BUILDER', reason: 'Manually reviewed' });
    expect(approved.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).accountStatus).toBe('ACTIVE');
    expect(channelForRole('BUILDER')).toBe('VIP');
    expect(channelForRole('WATERWORKER')).toBe('VIP');
    expect(channelForRole('SUB_DEALER')).toBe('TRADE');
  });
});
