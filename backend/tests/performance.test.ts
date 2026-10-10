import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Express } from 'express';
import request from 'supertest';
import { buildApp, prisma, createUser, loginAgent, seedProduct } from './helpers';

describe('Performance accounting (requirement 90 - performance tests)', () => {
  let app: Express;

  beforeAll(async () => {
    app = buildApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function setupAgent(adminEmail: string) {
    const agentEmail = `perf${Date.now()}${Math.floor(Math.random() * 9999)}@test.com.au`;
    const userId = await createUser(agentEmail, 'REGIONAL_AGENT');
    await prisma.memberProfile.create({
      data: {
        userId, firstName: 'P', lastName: 'U', companyName: 'Perf Co',
        streetAddress: '1 St', suburb: 'City', state: 'NSW', postcode: '2000', country: 'Australia',
        approvedAt: new Date(),
      },
    });
    await prisma.memberId.create({
      data: { userId, aurId: `AUR-DE-${Date.now()}`, prefix: 'AUR-DE', year: 2026, sequence: Math.floor(Math.random() * 900000) },
    });
    const adminId = await createUser(adminEmail, 'ADMIN');
    void adminId;
    return { agent: await loginAgent(app, agentEmail), admin: await loginAgent(app, adminEmail), userId };
  }

  async function placeOrder(agentToken: string): Promise<{ orderId: number; total: number }> {
    const productId = await seedProduct(app);
    await request(app).post('/api/cart').set('Authorization', `Bearer ${agentToken}`).send({ productId, quantity: 1 });
    const cartRes = await request(app).get('/api/cart').set('Authorization', `Bearer ${agentToken}`);
    const cart = cartRes.body.data as { id: number };
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        cartId: cart.id,
        shippingName: 'P U', shippingPhone: '0411111111',
        shippingStreet: '1 St', shippingSuburb: 'City', shippingState: 'NSW', shippingPostcode: '2000',
        shippingMethod: 'PICKUP',
      });
    expect(orderRes.status).toBe(201);
    return orderRes.body.data as { orderId: number; total: number };
  }

  async function payOrder(agentToken: string, orderId: number): Promise<void> {
    const res = await request(app)
      .post(`/api/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ method: 'SANDBOX' });
    expect(res.status).toBe(200);
  }

  it('unpaid orders do NOT count towards performance', async () => {
    const { agent, userId } = await setupAgent(`adminperf1${Date.now()}@test.com.au`);
    await placeOrder(agent.token);
    const perf = await request(app).get('/api/performance').set('Authorization', `Bearer ${agent.token}`);
    expect(perf.body.data.totalOrders).toBe(0);
    expect(perf.body.data.totalSales).toBe(0);
    void userId;
  });

  it('payment credits performance with the paid amount', async () => {
    const { agent } = await setupAgent(`adminperf2${Date.now()}@test.com.au`);
    const order = await placeOrder(agent.token);
    await payOrder(agent.token, order.orderId);
    const perf = await request(app).get('/api/performance').set('Authorization', `Bearer ${agent.token}`);
    expect(perf.body.data.totalOrders).toBe(1);
    expect(perf.body.data.totalSales).toBe(order.total);
    expect(perf.body.data.monthSales).toBe(order.total);
    expect(perf.body.data.yearSales).toBe(order.total);
  });

  it('cancelled orders do not count', async () => {
    const { agent } = await setupAgent(`adminperf3${Date.now()}@test.com.au`);
    const order = await placeOrder(agent.token);
    const cancel = await request(app)
      .post(`/api/orders/${order.orderId}/cancel`)
      .set('Authorization', `Bearer ${agent.token}`);
    expect(cancel.status).toBe(200);
    const perf = await request(app).get('/api/performance').set('Authorization', `Bearer ${agent.token}`);
    expect(perf.body.data.totalOrders).toBe(0);
  });

  it('refunds deduct performance and create an adjustment record', async () => {
    const { agent, admin, userId } = await setupAgent(`adminperf4${Date.now()}@test.com.au`);
    const order = await placeOrder(agent.token);
    await payOrder(agent.token, order.orderId);

    const before = await request(app).get('/api/performance').set('Authorization', `Bearer ${agent.token}`);
    expect(before.body.data.totalSales).toBe(order.total);

    const refund = await request(app)
      .post(`/api/admin/orders/${order.orderId}/refund`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ amount: order.total, reason: 'Test refund' });
    expect(refund.status).toBe(200);

    const after = await request(app).get('/api/performance').set('Authorization', `Bearer ${agent.token}`);
    expect(after.body.data.totalSales).toBe(0);

    const adjustments = await prisma.performanceAdjustment.findMany({
      where: { orderId: order.orderId },
    });
    expect(adjustments.length).toBe(1);
    expect(adjustments[0].type).toBe('REFUND');
    expect(adjustments[0].adjustedAmount).toBe(-order.total);
    expect(adjustments[0].resultingAmount).toBe(0);
    void userId;
  });

  it('partial refunds deduct proportionally', async () => {
    const { agent, admin } = await setupAgent(`adminperf5${Date.now()}@test.com.au`);
    const order = await placeOrder(agent.token);
    await payOrder(agent.token, order.orderId);
    const half = Math.round(order.total / 2 * 100) / 100;
    const refund = await request(app)
      .post(`/api/admin/orders/${order.orderId}/refund`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ amount: half, reason: 'Partial refund' });
    expect(refund.status).toBe(200);
    const perf = await request(app).get('/api/performance').set('Authorization', `Bearer ${agent.token}`);
    expect(Math.abs(perf.body.data.totalSales - (order.total - half))).toBeLessThan(0.02);
  });
});

describe('Permission isolation (requirement 90 - permission tests)', () => {
  let app: Express;

  beforeAll(async () => {
    app = buildApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('anonymous price API access returns 401 on member endpoints', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
  });

  it('members cannot access admin endpoints', async () => {
    const email = `memberiso${Date.now()}@test.com.au`;
    await createUser(email, 'SUB_DEALER');
    const agent = await loginAgent(app, email);
    const res = await request(app).get('/api/admin/members').set('Authorization', `Bearer ${agent.token}`);
    expect(res.status).toBe(403);
  });

  it('a Level1 member cannot read another member\'s orders', async () => {
    const a = `orderowner${Date.now()}@test.com.au`;
    const b = `orderthief${Date.now()}@test.com.au`;
    const ownerId = await createUser(a, 'REGIONAL_AGENT');
    await prisma.memberProfile.create({
      data: {
        userId: ownerId, firstName: 'O', lastName: 'W', companyName: 'Owner Co',
        streetAddress: '1 St', suburb: 'City', state: 'NSW', postcode: '2000', country: 'Australia', approvedAt: new Date(),
      },
    });
    await prisma.memberId.create({
      data: { userId: ownerId, aurId: `AUR-DE-${Date.now()}`, prefix: 'AUR-DE', year: 2026, sequence: Math.floor(Math.random() * 900000) },
    });
    const owner = await loginAgent(app, a);
    await createUser(b, 'SUB_DEALER');
    const thief = await loginAgent(app, b);

    const productId = await seedProduct(app);
    await request(app).post('/api/cart').set('Authorization', `Bearer ${owner.token}`).send({ productId, quantity: 1 });
    const cart = (await request(app).get('/api/cart').set('Authorization', `Bearer ${owner.token}`)).body.data as { id: number };
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        cartId: cart.id, shippingName: 'O W', shippingPhone: '0411111111',
        shippingStreet: '1 St', shippingSuburb: 'City', shippingState: 'NSW', shippingPostcode: '2000', shippingMethod: 'PICKUP',
      });
    const orderId = (orderRes.body.data as { orderId: number }).orderId;

    const stolen = await request(app).get(`/api/orders/${orderId}`).set('Authorization', `Bearer ${thief.token}`);
    expect(stolen.status).toBe(404);
  });
});
