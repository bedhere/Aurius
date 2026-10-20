import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import { unlink } from 'node:fs/promises';
import type { Express } from 'express';
import { buildApp, createUser, loginAgent, prisma } from './helpers';
import { config } from '../src/config';

describe('independent product diagrams', () => {
  let app: Express;
  let token: string;
  let productId: number;
  const dimensionImage = '/products/nova-au-6885-dimensions.jpg';
  const featureImage = '/products/nova-au-6885-features.jpg';
  const uploadedFiles: string[] = [];

  beforeAll(async () => {
    app = buildApp();
    const email = `product-diagrams-${Date.now()}@test.com.au`;
    await createUser(email, 'ADMIN');
    token = (await loginAgent(app, email)).token;
  });

  afterAll(async () => {
    await Promise.all(uploadedFiles.map((file) => unlink(file)));
    await prisma.$disconnect();
  });

  it('creates diagrams separately from gallery images and returns them in admin and public APIs', async () => {
    const response = await request(app).post('/api/admin/products').set('Authorization', `Bearer ${token}`).send({
      productCode: `DIAGRAM-${Date.now()}`, sku: `DIAGRAM-SKU-${Date.now()}`, name: 'Diagram test product',
      category: 'Smart Toilet', description: 'Dedicated product diagram coverage', status: 'ACTIVE', stock: 1,
      images: ['/uploads/products/gallery.jpg'], specs: { sizes: ['AU-6885'] }, dimensionImage, featureImage,
    });
    expect(response.status).toBe(201);
    productId = response.body.data.id;
    for (const endpoint of [`/api/admin/products/${productId}`, `/api/products/${productId}`]) {
      const result = await request(app).get(endpoint).set('Authorization', `Bearer ${token}`);
      expect(result.status).toBe(200);
      expect(result.body.data).toMatchObject({ dimensionImage, featureImage, images: ['/uploads/products/gallery.jpg'], specs: { sizes: ['AU-6885'] } });
    }
    const listing = await request(app).get('/api/products').query({ search: 'Diagram test product' });
    expect(listing.body.data.items).toContainEqual(expect.objectContaining({ id: productId, dimensionImage, featureImage }));
  });

  it('preserves omitted diagram fields and clears each diagram independently', async () => {
    const rename = await request(app).put(`/api/admin/products/${productId}`).set('Authorization', `Bearer ${token}`).send({ name: 'Diagram updated product' });
    expect(rename.status).toBe(200);
    expect(await prisma.product.findUnique({ where: { id: productId } })).toMatchObject({ dimensionImage, featureImage });
    const clear = await request(app).put(`/api/admin/products/${productId}`).set('Authorization', `Bearer ${token}`).send({ dimensionImage: null });
    expect(clear.status).toBe(200);
    expect(await prisma.product.findUnique({ where: { id: productId } })).toMatchObject({ dimensionImage: null, featureImage });
    await request(app).put(`/api/admin/products/${productId}`).set('Authorization', `Bearer ${token}`).send({ featureImage: null });
    const detail = await request(app).get(`/api/products/${productId}`);
    expect(detail.body.data).toMatchObject({ dimensionImage: null, featureImage: null, images: ['/uploads/products/gallery.jpg'] });
  });

  it('uploads a real image through the protected existing endpoint and saves it as a diagram', async () => {
    const result = await request(app).post('/api/admin/products/images').set('Authorization', `Bearer ${token}`)
      .attach('file', path.resolve(__dirname, '../../frontend/public/products/nova-au-6885-dimensions.jpg'));
    expect(result.status).toBe(200);
    const url = result.body.data.url;
    uploadedFiles.push(path.join(config.uploadPath, 'products', path.basename(url)));
    expect(url).toMatch(/^\/uploads\/products\/.+\.jpg$/);
    const asset = await request(app).get(url);
    expect(asset.status).toBe(200);
    expect(asset.headers['content-type']).toMatch(/^image\/jpeg/);
    const save = await request(app).put(`/api/admin/products/${productId}`).set('Authorization', `Bearer ${token}`).send({ dimensionImage: url });
    expect(save.status).toBe(200);
    expect((await request(app).get(`/api/products/${productId}`)).body.data.dimensionImage).toBe(url);
  });

  it('rejects unsafe diagram paths and keeps existing product data intact', async () => {
    for (const invalid of ['javascript:alert(1)', '/uploads/products/../../licences/private.png', { url: dimensionImage }]) {
      const result = await request(app).put(`/api/admin/products/${productId}`).set('Authorization', `Bearer ${token}`).send({ featureImage: invalid });
      expect(result.status).toBe(400);
    }
    expect((await prisma.product.findUnique({ where: { id: productId } }))?.featureImage).toBeNull();
  });

  it('does not allow anonymous visitors to upload or change product diagrams', async () => {
    expect((await request(app).post('/api/admin/products/images')).status).toBe(401);
    expect((await request(app).put(`/api/admin/products/${productId}`).send({ dimensionImage })).status).toBe(401);
  });
});
