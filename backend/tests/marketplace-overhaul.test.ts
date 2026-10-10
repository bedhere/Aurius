import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { buildApp, prisma, createUser, loginAgent, seedProduct } from './helpers';
import { runAnnualPurchaseReminders, sendProductLaunchPromotion } from '../src/services/reminderService';

describe('Marketplace overhaul regression coverage', () => {
  let app: Express;

  beforeAll(() => {
    app = buildApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('allows anonymous shoppers to load shipping methods', async () => {
    const response = await request(app).get('/api/shipping-methods');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'STANDARD' }),
    ]));
  });

  it('shows an active partner only their own dedicated price', async () => {
    const productId = await seedProduct(app);
    await prisma.productPrice.update({
      where: { productId },
      data: { retailPrice: 200, promoPrice: 180 },
    });
    const vip = await createUser(`vip-price-${Date.now()}@test.com.au`, 'LICENSED_TRADESMAN');
    const agent = await loginAgent(app, (await prisma.user.findUnique({ where: { id: vip } }))!.email);

    const response = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${agent.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.prices).toEqual(expect.objectContaining({
      retail: null,
      promo: null,
      member: 120,
      memberLabel: 'VIP price',
      rrp: null,
    }));
    expect(response.body.data.rrp).toBeNull();
    expect(response.body.data.prices).not.toHaveProperty('level1Price');
    expect(response.body.data.prices).not.toHaveProperty('level3Price');
    expect(response.body.data.prices).not.toHaveProperty('dealer1Price');
  });

  it('uses the same configured sub-dealer price for display and checkout', async () => {
    const productId = await seedProduct(app);
    await prisma.productPrice.update({
      where: { productId },
      data: { retailPrice: 200, promoPrice: 180, distributor2Price: 130 },
    });
    const subDealerId = await createUser(`sub-dealer-price-${Date.now()}@test.com.au`, 'SUB_DEALER');
    await prisma.memberId.create({
      data: {
        userId: subDealerId,
        aurId: `AUR-SD-${Date.now()}`,
        prefix: 'AUR-SD',
        year: 2026,
        sequence: Math.floor(Math.random() * 100000),
      },
    });
    const subDealer = await loginAgent(app, (await prisma.user.findUnique({ where: { id: subDealerId } }))!.email);

    const product = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${subDealer.token}`);
    expect(product.body.data.prices.member).toBe(130);

    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${subDealer.token}`)
      .send({ productId, quantity: 1 })
      .expect(200);
    const cart = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${subDealer.token}`);

    expect(cart.body.data.items[0].unitPrice).toBe(130);
  });

  it('does not expose a pending account tier price before approval', async () => {
    const productId = await seedProduct(app);
    await prisma.productPrice.update({
      where: { productId },
      data: { retailPrice: 200, promoPrice: 180 },
    });
    const pendingUserId = await createUser(
      `pending-price-${Date.now()}@test.com.au`,
      'LICENSED_TRADESMAN',
      'PENDING_REVIEW',
    );
    const pending = await loginAgent(app, (await prisma.user.findUnique({ where: { id: pendingUserId } }))!.email);

    const response = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${pending.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.prices).toEqual(expect.objectContaining({
      retail: 200,
      promo: 180,
      member: null,
    }));
  });

  it('allows an anonymous shopper to create a retail order without authentication', async () => {
    const productId = await seedProduct(app);
    await prisma.productPrice.update({
      where: { productId },
      data: { retailPrice: 200, promoPrice: 180 },
    });

    const response = await request(app).post('/api/guest-checkout').send({
      productId,
      quantity: 1,
      guestEmail: `guest-${Date.now()}@test.com.au`,
      shippingName: 'Retail Customer',
      shippingPhone: '0411111111',
      shippingStreet: '1 Test St',
      shippingSuburb: 'Sydney',
      shippingState: 'NSW',
      shippingPostcode: '2000',
      shippingMethod: 'PICKUP',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.total).toBe(180);
    expect(response.body.data.guestToken).toEqual(expect.any(String));
  });

  it('stores a waterworker installation address and optional customer email', async () => {
    const waterworkerEmail = `waterworker-install-${Date.now()}@test.com.au`;
    const waterworkerId = await createUser(waterworkerEmail, 'WATERWORKER');
    await prisma.memberId.create({
      data: {
        userId: waterworkerId,
        aurId: `AUR-WW-${Date.now()}`,
        prefix: 'AUR-WW',
        year: 2026,
        sequence: Math.floor(Math.random() * 100000),
      },
    });
    const waterworker = await loginAgent(app, waterworkerEmail);

    const response = await request(app)
      .post('/api/installations')
      .set('Authorization', `Bearer ${waterworker.token}`)
      .send({
        productName: 'AURIUS Smart Toilet S86',
        serialNumber: 'S86-TEST-001',
        installationDate: '2026-09-02T00:00:00.000Z',
        installationAddress: '1 Installation Street, Sydney NSW 2000',
        contactEmail: 'customer-install@example.com',
      });

    expect(response.status).toBe(200);
    const record = await prisma.installationRecord.findUnique({ where: { id: response.body.data.id } });
    expect(record).toEqual(expect.objectContaining({
      technicianUserId: waterworkerId,
      installationAddress: '1 Installation Street, Sydney NSW 2000',
      contactEmail: 'customer-install@example.com',
    }));
  });

  it('limits installation reporting to waterworker accounts', async () => {
    const partnerEmail = `partner-install-${Date.now()}@test.com.au`;
    await createUser(partnerEmail, 'LICENSED_TRADESMAN');
    const partner = await loginAgent(app, partnerEmail);

    const response = await request(app)
      .post('/api/installations')
      .set('Authorization', `Bearer ${partner.token}`)
      .send({
        productName: 'AURIUS Smart Toilet S86',
        installationAddress: '1 Installation Street, Sydney NSW 2000',
      });

    expect(response.status).toBe(403);
  });

  it('filters water products by the requested named series', async () => {
    const ruijingId = await seedProduct(app, {
      category: 'Whole-House Water Purification',
      series: '瑞景',
      name: 'Ruijing Water System',
      sku: `RUJING-${Date.now()}`,
    });
    await seedProduct(app, {
      category: 'Whole-House Water Purification',
      series: '赛博',
      name: 'Saibo Water System',
      sku: `SAIBO-${Date.now()}`,
    });

    const response = await request(app).get('/api/products?category=water&series=%E7%91%9E%E6%99%AF');

    expect(response.status).toBe(200);
    expect(response.body.data.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: ruijingId, series: '瑞景' }),
    ]));
    expect(response.body.data.items).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ series: '赛博' }),
    ]));
  });

  it('rejects repeated product filter parameters instead of broadening a water series result', async () => {
    const response = await request(app)
      .get('/api/products?category=water&series=%E7%91%9E%E6%99%AF&series=%E8%B5%9B%E5%8D%9A');

    expect(response.status).toBe(400);
  });

  it('rejects conflicting water series and filter-core parameters', async () => {
    const response = await request(app)
      .get('/api/products?category=water&series=%E7%91%9E%E6%99%AF&waterSubcategory=filter-core');

    expect(response.status).toBe(400);
  });

  it('rejects guest orders for engineering floor drains', async () => {
    const productId = await seedProduct(app, {
      category: 'Engineering Custom Floor Drain',
      productCode: `AUR-FD-${Date.now()}`,
    });
    await prisma.productPrice.update({
      where: { productId },
      data: { retailPrice: 200, promoPrice: 180 },
    });

    const response = await request(app).post('/api/guest-checkout').send({
      productId,
      quantity: 1,
      guestEmail: 'retail@example.com',
      shippingName: 'Retail Customer',
      shippingPhone: '0411111111',
      shippingStreet: '1 Test St',
      shippingSuburb: 'Sydney',
      shippingState: 'NSW',
      shippingPostcode: '2000',
      shippingMethod: 'STANDARD',
    });

    expect(response.status).toBe(400);
    expect(response.body.message.toLowerCase()).toContain('engineering');
  });

  it('sends annual reminders to retail recipients but excludes partner accounts', async () => {
    const productId = await seedProduct(app);
    const now = new Date('2026-09-01T12:00:00.000Z');
    const paidAt = new Date('2025-08-31T12:00:00.000Z');

    const partnerUserId = await createUser(`partner-${Date.now()}@test.com.au`, 'SUB_DEALER');

    const createPaidOrder = async (data: {
      userId?: number;
      guestEmail?: string;
      lastReminderSentAt?: Date | null;
    }) => {
      const order = await prisma.order.create({
        data: {
          orderNumber: `REM-${Date.now()}-${Math.random()}`,
          userId: data.userId ?? null,
          guestEmail: data.guestEmail,
          priceLevel: data.userId ? 3 : 0,
          status: 'DELIVERED',
          paymentStatus: 'PAID',
          shipmentStatus: 'DELIVERED',
          subtotal: 100,
          total: 100,
          shippingName: 'Customer Name',
          shippingPhone: '0411111111',
          shippingStreet: '1 Test St',
          shippingSuburb: 'Sydney',
          shippingState: 'NSW',
          shippingPostcode: '2000',
          shippingMethod: 'STANDARD',
          paidAt,
          lastReminderSentAt: data.lastReminderSentAt,
          items: {
            create: {
              productId,
              productName: 'Test Smart Toilet',
              sku: 'TEST',
              quantity: 1,
              unitPrice: 100,
              lineTotal: 100,
            },
          },
        },
      });
      return order;
    };

    const guestOrder = await createPaidOrder({ guestEmail: 'guest-retail@example.com' });
    const partnerOrder = await createPaidOrder({ userId: partnerUserId });

    const result = await runAnnualPurchaseReminders(now);

    expect(result.sent).toBe(1);
    const sentRecipients = await prisma.emailLog.findMany({
      where: { template: 'ANNUAL_REMINDER' },
      select: { recipient: true },
    });
    expect(sentRecipients.map((entry) => entry.recipient)).toEqual(expect.arrayContaining([
      'guest-retail@example.com',
    ]));
    expect(sentRecipients.map((entry) => entry.recipient)).not.toContain(
      (await prisma.user.findUnique({ where: { id: partnerUserId }, select: { email: true } }))?.email,
    );
    expect((await prisma.order.findUnique({ where: { id: guestOrder.id } }))?.lastReminderSentAt).toEqual(now);
    expect((await prisma.order.findUnique({ where: { id: partnerOrder.id } }))?.lastReminderSentAt).toBeNull();
  });

  it('returns all editable product fields from the admin detail endpoint', async () => {
    const productId = await seedProduct(app, {
      description: 'Preserved description',
      specs: JSON.stringify({ sizes: ['S86'] }),
    });
    const adminEmail = `admin-detail-${Date.now()}@test.com.au`;
    await createUser(adminEmail, 'ADMIN');
    const admin = await loginAgent(app, adminEmail);

    const response = await request(app)
      .get(`/api/admin/products/${productId}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({
      description: 'Preserved description',
      specs: { sizes: ['S86'] },
    }));
  });

  it('uses both guest and eligible retail member emails for launch promotions without partner emails', async () => {
    const partnerEmail = `partner-promo-${Date.now()}@test.com.au`;
    const partnerUserId = await createUser(partnerEmail, 'SUB_DEALER');

    await prisma.order.createMany({
      data: [
        {
          orderNumber: `PROMO-GUEST-${Date.now()}`,
          guestEmail: 'promo-guest@example.com',
          priceLevel: 0,
          status: 'DELIVERED',
          paymentStatus: 'PAID',
          shipmentStatus: 'DELIVERED',
          subtotal: 100,
          total: 100,
          shippingName: 'Guest',
          shippingPhone: '0411111111',
          shippingStreet: '1 Test St',
          shippingSuburb: 'Sydney',
          shippingState: 'NSW',
          shippingPostcode: '2000',
          shippingMethod: 'STANDARD',
        },
        {
          orderNumber: `PROMO-PARTNER-${Date.now()}`,
          userId: partnerUserId,
          priceLevel: 3,
          status: 'DELIVERED',
          paymentStatus: 'PAID',
          shipmentStatus: 'DELIVERED',
          subtotal: 100,
          total: 100,
          shippingName: 'Partner',
          shippingPhone: '0411111111',
          shippingStreet: '1 Test St',
          shippingSuburb: 'Sydney',
          shippingState: 'NSW',
          shippingPostcode: '2000',
          shippingMethod: 'STANDARD',
        },
      ],
    });

    await sendProductLaunchPromotion({
      subject: 'New product',
      message: 'A new product is available',
      productName: 'New product',
    });

    const sentRecipients = await prisma.emailLog.findMany({
      where: { template: 'NEW_PRODUCT_PROMOTION' },
      select: { recipient: true },
    });
    expect(sentRecipients.map((entry) => entry.recipient)).toEqual(expect.arrayContaining([
      'promo-guest@example.com',
    ]));
    expect(sentRecipients.map((entry) => entry.recipient)).not.toContain(partnerEmail);
  });

  it('does not approve waterworker or builder accounts without a configured ABR result', async () => {
    const response = await request(app)
      .post('/api/applications')
      .send({
        channel: 'TRADE',
        email: `waterworker-${Date.now()}@test.com.au`,
        tradeType: 'NOT_APPLICABLE',
        state: 'NSW',
        licenceType: 'COMPANY',
        licenceNumber: 'WW-123',
        firstName: 'Water',
        lastName: 'Worker',
        companyName: 'Water Co',
        streetAddress: '1 Test St',
        suburb: 'Sydney',
        postcode: '2000',
        country: 'Australia',
        phone: '0411111111',
        abnNumber: '51824753556',
        businessInterest: ['Water Purification'],
        privacyConsent: true,
        dealerAgreement: true,
        marketingConsent: false,
        password: 'Test@1234',
        confirmPassword: 'Test@1234',
      });
    expect(response.status).toBe(201);
    const application = await prisma.partnerApplication.findUnique({ where: { userId: response.body.data.userId } });
    expect(application).not.toBeNull();
    const adminEmail = `admin-abr-${Date.now()}@test.com.au`;
    await createUser(adminEmail, 'ADMIN');
    const admin = await loginAgent(app, adminEmail);

    const review = await request(app)
      .post(`/api/admin/applications/${application!.id}/review`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ action: 'APPROVE', role: 'WATERWORKER' });

    expect(review.status).toBe(400);
    expect(review.body.message).toContain('ABR');
  });

  it('stores dealer locations with map coordinates and active status', async () => {
    const location = await prisma.dealerLocation.create({
      data: {
        name: 'Sydney Test Showroom',
        phone: '+61 2 9000 0000',
        address: '1 George Street',
        city: 'Sydney',
        state: 'NSW',
        latitude: -33.8688,
        longitude: 151.2093,
        photos: JSON.stringify([]),
        note: 'Test showroom',
        active: true,
      },
    });

    expect(location.latitude).toBe(-33.8688);
    expect(location.longitude).toBe(151.2093);
    expect(location.active).toBe(true);
  });

  it('returns active dealer locations publicly and hides inactive locations', async () => {
    await prisma.dealerLocation.createMany({
      data: [
        {
          name: 'Public Dealer',
          address: '1 Main St',
          latitude: -33,
          longitude: 151,
          photos: '[]',
          active: true,
        },
        {
          name: 'Hidden Dealer',
          address: '2 Main St',
          latitude: -34,
          longitude: 152,
          photos: '[]',
          active: false,
        },
      ],
    });

    const response = await request(app).get('/api/dealers');

    expect(response.status).toBe(200);
    expect(response.body.data.map((item: { name: string }) => item.name)).toContain('Public Dealer');
    expect(response.body.data.map((item: { name: string }) => item.name)).not.toContain('Hidden Dealer');
  });

  it('allows an administrator to create, update, list, and delete dealer locations', async () => {
    const adminEmail = `dealer-admin-${Date.now()}@test.com.au`;
    await createUser(adminEmail, 'ADMIN');
    const admin = await loginAgent(app, adminEmail);
    const payload = {
      name: 'CRUD Dealer',
      phone: '+61 2 9000 0000',
      address: '10 Test Street',
      city: 'Sydney',
      state: 'NSW',
      latitude: -33.8688,
      longitude: 151.2093,
      photos: [],
      note: 'Initial note',
      active: true,
    };

    const created = await request(app)
      .post('/api/admin/dealers')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(payload);
    expect(created.status).toBe(201);

    const id = created.body.data.id;
    const updated = await request(app)
      .put(`/api/admin/dealers/${id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ...payload, name: 'Updated Dealer', active: false });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe('Updated Dealer');
    expect(updated.body.data.active).toBe(false);

    const listed = await request(app)
      .get('/api/admin/dealers')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(listed.body.data.some((item: { id: number }) => item.id === id)).toBe(true);

    const deleted = await request(app)
      .delete(`/api/admin/dealers/${id}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(deleted.status).toBe(200);
    expect(await prisma.dealerLocation.findUnique({ where: { id } })).toBeNull();
  });

  it('denies dealer-location administration to anonymous users and non-admin members', async () => {
    const publicResponse = await request(app).get('/api/admin/dealers');
    expect(publicResponse.status).toBe(401);

    const memberEmail = `dealer-member-${Date.now()}@test.com.au`;
    await createUser(memberEmail, 'SUB_DEALER');
    const member = await loginAgent(app, memberEmail);
    const response = await request(app)
      .post('/api/admin/dealers')
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        name: 'Denied Dealer',
        address: '1 Test St',
        latitude: -33,
        longitude: 151,
      });
    expect(response.status).toBe(403);
  });

  it('rejects dealer locations with invalid map coordinates', async () => {
    const adminEmail = `dealer-coordinate-admin-${Date.now()}@test.com.au`;
    await createUser(adminEmail, 'ADMIN');
    const admin = await loginAgent(app, adminEmail);

    const response = await request(app)
      .post('/api/admin/dealers')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'Invalid Coordinate Dealer',
        address: '1 Test St',
        latitude: -91,
        longitude: 151,
      });

    expect(response.status).toBe(400);
  });
});
