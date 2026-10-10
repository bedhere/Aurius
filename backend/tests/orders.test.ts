import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Express } from 'express';
import request from 'supertest';
import { buildApp, prisma, createUser, loginAgent, seedProduct } from './helpers';

describe('Orders: server-side pricing & stock (requirement 90 - order tests)', () => {
  let app: Express;

  beforeAll(async () => {
    app = buildApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function setupTierUser(role: 'REGIONAL_AGENT' | 'LICENSED_TRADESMAN' | 'SUB_DEALER') {
    const email = `${role.toLowerCase()}${Date.now()}@test.com.au`;
    const userId = await createUser(email, role);
    await prisma.memberProfile.create({
      data: {
        userId,
        firstName: 'T', lastName: 'U', companyName: 'Test Co',
        streetAddress: '1 St', suburb: 'City', state: 'NSW', postcode: '2000', country: 'Australia',
        approvedAt: new Date(),
      },
    });
    await prisma.memberId.create({
      data: { userId, aurId: `AUR-XX-${Date.now()}`, prefix: 'AUR-XX', year: 2026, sequence: Math.floor(Math.random() * 100000) },
    });
    return loginAgent(app, email);
  }

  it('prices are computed by the backend, tampered totals are ignored', async () => {
    const productId = await seedProduct(app);
    const agent = await setupTierUser('LICENSED_TRADESMAN');

    const add = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${agent.token}`)
      .send({ productId, quantity: 2 });
    expect(add.status).toBe(200);

    const cartRes = await request(app).get('/api/cart').set('Authorization', `Bearer ${agent.token}`);
    const cart = cartRes.body.data as { id: number; subtotal: number };
    expect(cart.subtotal).toBe(240); // 2 x level2 (120)

    const checkout = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${agent.token}`)
      .send({
        cartId: cart.id,
        shippingName: 'T U', shippingPhone: '0411111111',
        shippingStreet: '1 St', shippingSuburb: 'City', shippingState: 'NSW', shippingPostcode: '2000',
        shippingMethod: 'PICKUP',
        total: 0.01, // tampered — must be ignored
      });
    expect(checkout.status).toBe(201);
    const order = checkout.body.data as { total: number };
    expect(order.total).toBe(240); // server recomputed
  });

  it('rejects ordering when stock is insufficient', async () => {
    const productId = await seedProduct(app);
    await prisma.product.update({ where: { id: productId }, data: { stock: 3 } });
    const agent = await setupTierUser('SUB_DEALER');

    const add = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${agent.token}`)
      .send({ productId, quantity: 5 });
    expect(add.status).toBe(400);

    const addOk = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${agent.token}`)
      .send({ productId, quantity: 3 });
    expect(addOk.status).toBe(200);
    const cartRes = await request(app).get('/api/cart').set('Authorization', `Bearer ${agent.token}`);
    const cart = cartRes.body.data as { id: number };

    // Reduce stock behind the cart's back, then checkout must fail
    await prisma.product.update({ where: { id: productId }, data: { stock: 2 } });
    const checkout = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${agent.token}`)
      .send({
        cartId: cart.id,
        shippingName: 'T U', shippingPhone: '0411111111',
        shippingStreet: '1 St', shippingSuburb: 'City', shippingState: 'NSW', shippingPostcode: '2000',
        shippingMethod: 'PICKUP',
      });
    expect(checkout.status).toBe(400);
    expect(checkout.body.message).toContain('Insufficient stock');
  });

  it('each price tier pays its own level price', async () => {
    const productId = await seedProduct(app);
    const expectations: { role: 'REGIONAL_AGENT' | 'LICENSED_TRADESMAN' | 'SUB_DEALER'; expected: number }[] = [
      { role: 'REGIONAL_AGENT', expected: 100 },
      { role: 'LICENSED_TRADESMAN', expected: 120 },
      { role: 'SUB_DEALER', expected: 140 },
    ];
    for (const { role, expected } of expectations) {
      const agent = await setupTierUser(role);
      const res = await request(app).get('/api/products').set('Authorization', `Bearer ${agent.token}`);
      const item = (res.body.data.items as { id: number; price: { value: number; level: number } | null }[]).find((i) => i.id === productId);
      expect(item?.price?.value).toBe(expected);
      expect(item?.price?.level).toBe(expected === 100 ? 1 : expected === 120 ? 2 : 3);
    }
  });

  it('returns a product option list without exposing other price tiers', async () => {
    const productId = await seedProduct(app);

    const res = await request(app).get(`/api/products/${productId}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.variants)).toBe(true);
    expect(res.body.data.variants).toEqual([]);
    expect(res.body.data).not.toHaveProperty('level1Price');
    expect(res.body.data).not.toHaveProperty('level2Price');
    expect(res.body.data).not.toHaveProperty('level3Price');
  });

  it('snapshots an active product option in the cart and order', async () => {
    const productId = await seedProduct(app);
    const variant = await prisma.productVariant.create({
      data: {
        productId,
        skuSuffix: '900-GR',
        name: '900 mm / Graphite',
        attributes: JSON.stringify({ length: '900 mm', colour: 'Graphite' }),
        priceAdjustment: 15,
        stock: 8,
      },
    });
    const agent = await setupTierUser('LICENSED_TRADESMAN');

    const add = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${agent.token}`)
      .send({ productId, quantity: 1, variantId: variant.id });
    expect(add.status).toBe(200);

    const cart = (await request(app).get('/api/cart').set('Authorization', `Bearer ${agent.token}`)).body.data as {
      id: number;
      items: { variantId: number | null; variantName: string | null; unitPrice: number }[];
    };
    expect(cart.items[0].variantId).toBe(variant.id);
    expect(cart.items[0].variantName).toBe('900 mm / Graphite');
    expect(cart.items[0].unitPrice).toBe(135);

    const checkout = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${agent.token}`)
      .send({
        cartId: cart.id,
        shippingName: 'T U',
        shippingPhone: '0411111111',
        shippingStreet: '1 St',
        shippingSuburb: 'City',
        shippingState: 'NSW',
        shippingPostcode: '2000',
        shippingMethod: 'PICKUP',
      });
    expect(checkout.status).toBe(201);

    const orderItem = await prisma.orderItem.findFirst({ where: { orderId: checkout.body.data.orderId } });
    expect(orderItem?.variantId).toBe(variant.id);
    expect(orderItem?.variantName).toBe('900 mm / Graphite');
    expect(orderItem?.variantAttributes).toContain('900 mm');
    expect(orderItem?.unitPrice).toBe(135);
  });

  it('admin order detail returns the nested shipping data used by the admin page', async () => {
    const productId = await seedProduct(app);
    const agent = await setupTierUser('LICENSED_TRADESMAN');
    const cartResponse = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${agent.token}`)
      .send({ productId, quantity: 1 });
    const cart = (await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${agent.token}`)).body.data as { id: number };
    const checkout = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${agent.token}`)
      .send({
        cartId: cart.id,
        shippingName: 'T U',
        shippingPhone: '0411111111',
        shippingStreet: '1 St',
        shippingSuburb: 'City',
        shippingState: 'NSW',
        shippingPostcode: '2000',
        shippingMethod: 'PICKUP',
      });
    expect(cartResponse.status).toBe(200);
    expect(checkout.status).toBe(201);

    const adminId = await createUser(`adminorderdetail${Date.now()}@test.com.au`, 'ADMIN');
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    const adminAgent = await loginAgent(app, admin!.email);
    const detail = await request(app)
      .get(`/api/admin/orders/${checkout.body.data.orderId}`)
      .set('Authorization', `Bearer ${adminAgent.token}`);

    expect(detail.status).toBe(200);
    expect(detail.body.data.shipping).toEqual(expect.objectContaining({
      name: 'T U',
      phone: '0411111111',
      street: '1 St',
      suburb: 'City',
      state: 'NSW',
      postcode: '2000',
      method: 'PICKUP',
    }));
  });

  it('requires a variant when the product has active variants', async () => {
    const productId = await seedProduct(app);
    await prisma.productVariant.create({
      data: {
        productId,
        skuSuffix: '900-GR',
        name: '900 mm / Graphite',
        attributes: JSON.stringify({ length: '900 mm', colour: 'Graphite' }),
        priceAdjustment: 15,
        stock: 8,
      },
    });
    const agent = await setupTierUser('LICENSED_TRADESMAN');

    const add = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${agent.token}`)
      .send({ productId, quantity: 1 });

    expect(add.status).toBe(400);
    expect(add.body.message).toContain('variant');
  });

  it('rejects a variant belonging to another product', async () => {
    const productId = await seedProduct(app);
    const otherProductId = await seedProduct(app);
    const variant = await prisma.productVariant.create({
      data: {
        productId: otherProductId,
        skuSuffix: 'OTHER',
        name: 'Other model',
        attributes: JSON.stringify({ model: 'Other' }),
        priceAdjustment: 0,
        stock: 8,
      },
    });
    const agent = await setupTierUser('LICENSED_TRADESMAN');

    const add = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${agent.token}`)
      .send({ productId, quantity: 1, variantId: variant.id });

    expect(add.status).toBe(400);
    expect(add.body.message).toContain('unavailable');
  });

  it('does not mutate an unlimited product option stock during checkout or cancellation', async () => {
    const productId = await seedProduct(app);
    const variant = await prisma.productVariant.create({
      data: {
        productId,
        skuSuffix: 'UNLIMITED',
        name: 'Unlimited configuration',
        attributes: JSON.stringify({ finish: 'White' }),
        stock: null,
      },
    });
    const agent = await setupTierUser('LICENSED_TRADESMAN');

    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${agent.token}`)
      .send({ productId, quantity: 1, variantId: variant.id })
      .expect(200);

    const cart = (await request(app).get('/api/cart').set('Authorization', `Bearer ${agent.token}`)).body.data as { id: number };
    const checkout = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${agent.token}`)
      .send({
        cartId: cart.id,
        shippingName: 'T U',
        shippingPhone: '0411111111',
        shippingStreet: '1 St',
        shippingSuburb: 'City',
        shippingState: 'NSW',
        shippingPostcode: '2000',
        shippingMethod: 'PICKUP',
      });

    expect(checkout.status).toBe(201);
    expect((await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock).toBeNull();

    await request(app)
      .post(`/api/orders/${checkout.body.data.orderId}/cancel`)
      .set('Authorization', `Bearer ${agent.token}`)
      .expect(200);

    expect((await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock).toBeNull();
  });
});
