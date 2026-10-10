import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app';

// Shared helpers for the API test suite. All tests run against a fresh
// test database (see vitest.config.ts + global-setup.ts).

export const prisma = new PrismaClient();

export function buildApp(): Express {
  return createApp();
}

export interface Agent {
  token: string;
  email: string;
  userId: number;
  aurId?: string;
}

export async function createUser(
  email: string,
  role: 'ADMIN' | 'REGIONAL_AGENT' | 'LICENSED_TRADESMAN' | 'SUB_DEALER' | 'WATERWORKER' | 'BUILDER',
  status: 'ACTIVE' | 'PENDING_REVIEW' = 'ACTIVE',
  password = 'Test@1234',
): Promise<number> {
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash(password, 4);
  const level = role === 'REGIONAL_AGENT'
    ? 1
    : role === 'LICENSED_TRADESMAN'
      ? 2
      : role === 'SUB_DEALER'
        ? 3
        : role === 'WATERWORKER'
          ? 4
          : role === 'BUILDER'
            ? 5
            : null;
  const user = await prisma.user.create({
    data: { email, passwordHash: hash, role, accountStatus: status, memberLevel: level },
  });
  return user.id;
}

export async function loginAgent(app: Express, email: string, password = 'Test@1234'): Promise<Agent> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${JSON.stringify(res.body)}`);
  const user = await prisma.user.findUnique({ where: { email } });
  const memberId = await prisma.memberId.findUnique({ where: { userId: user!.id } });
  return {
    token: res.body.data.accessToken,
    email,
    userId: user!.id,
    aurId: memberId?.aurId ?? undefined,
  };
}

export function validApplication(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    channel: 'VIP',
    email: `plumber${Date.now()}${Math.floor(Math.random() * 10000)}@test.com.au`,
    tradeType: 'LICENSED_PLUMPER',
    state: 'NSW',
    licenceType: 'INDIVIDUAL',
    licenceNumber: 'PLB-12345',
    firstName: 'Test',
    lastName: 'Plumber',
    companyName: 'Test Plumbing Co',
    streetAddress: '1 Test St',
    suburb: 'Sydney',
    postcode: '2000',
    country: 'Australia',
    phone: '0411111111',
    abnNumber: '51824753556',
    yearsExperience: 5,
    smartToiletExp: 'Experienced (6+ units)',
    waterPurifExp: 'Basic experience (1-5 systems)',
    businessInterest: ['Smart Toilet'],
    privacyConsent: true,
    dealerAgreement: true,
    marketingConsent: false,
    password: 'Test@1234',
    confirmPassword: 'Test@1234',
    ...overrides,
  };
}

export async function seedProduct(app: Express, overrides: Record<string, unknown> = {}): Promise<number> {
  void app;
  const p = await prisma.product.create({
    data: {
      productCode: `AUR-T-${Date.now()}`,
      sku: `SKU-${Date.now()}`,
      name: 'Test Smart Toilet',
      category: 'Smart Toilet',
      model: 'T1',
      description: 'Test product for automated tests',
      images: '[]',
      stock: 100,
      status: 'ACTIVE',
      prices: {
        create: {
          level1Price: 100,
          level2Price: 120,
          level3Price: 140,
          rrp: 200,
        },
      },
      ...(overrides as never),
    },
  });
  return p.id;
}
