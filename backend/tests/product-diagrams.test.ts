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
  const remoteImage = '/products/nova-au-6885-remote.png';
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
      images: ['/uploads/products/gallery.jpg'], specs: { sizes: ['AU-6885'] }, remoteImage, dimensionImage, featureImage,
    });
    expect(response.status).toBe(201);
    productId = response.body.data.id;
    for (const endpoint of [`/api/admin/products/${productId}`, `/api/products/${productId}`]) {
      const result = await request(app).get(endpoint).set('Authorization', `Bearer ${token}`);
      expect(result.status).toBe(200);
      expect(result.body.data).toMatchObject({ remoteImage, dimensionImage, featureImage, images: ['/uploads/products/gallery.jpg'], specs: { sizes: ['AU-6885'] } });
    }
    const listing = await request(app).get('/api/products').query({ search: 'Diagram test product' });
    expect(listing.body.data.items).toContainEqual(expect.objectContaining({ id: productId, remoteImage, dimensionImage, featureImage }));
  });

  it('returns category and configurable remote in cart data', async () => {
    const email = `remote-cart-${Date.now()}@test.com.au`;
    await createUser(email, 'WATERWORKER');
    const memberToken = (await loginAgent(app, email)).token;
    const add = await request(app).post('/api/cart').set('Authorization', `Bearer ${memberToken}`).send({ productId, quantity: 1 });
    expect(add.status).toBe(200);
    const cart = await request(app).get('/api/cart').set('Authorization', `Bearer ${memberToken}`);
    expect(cart.body.data.items).toContainEqual(expect.objectContaining({ productId, category: 'Smart Toilet', remoteImage }));
  });

  it('preserves omitted diagram fields and clears each diagram independently', async () => {
    const rename = await request(app).put(`/api/admin/products/${productId}`).set('Authorization', `Bearer ${token}`).send({ name: 'Diagram updated product' });
    expect(rename.status).toBe(200);
    expect(await prisma.product.findUnique({ where: { id: productId } })).toMatchObject({ remoteImage, dimensionImage, featureImage });
    const clear = await request(app).put(`/api/admin/products/${productId}`).set('Authorization', `Bearer ${token}`).send({ dimensionImage: null });
    expect(clear.status).toBe(200);
    expect(await prisma.product.findUnique({ where: { id: productId } })).toMatchObject({ dimensionImage: null, featureImage });
    await request(app).put(`/api/admin/products/${productId}`).set('Authorization', `Bearer ${token}`).send({ featureImage: null });
    const detail = await request(app).get(`/api/products/${productId}`);
    expect(detail.body.data).toMatchObject({ dimensionImage: null, featureImage: null, images: ['/uploads/products/gallery.jpg'] });
  });

  it('replaces and deletes the remote independently, including after another save', async () => {
    const replacement = '/uploads/products/replaced-remote.png';
    expect((await request(app).put(`/api/admin/products/${productId}`).set('Authorization', `Bearer ${token}`).send({ remoteImage: replacement })).status).toBe(200);
    expect((await request(app).get(`/api/products/${productId}`)).body.data.remoteImage).toBe(replacement);
    expect((await request(app).put(`/api/admin/products/${productId}`).set('Authorization', `Bearer ${token}`).send({ remoteImage: null })).status).toBe(200);
    await request(app).put(`/api/admin/products/${productId}`).set('Authorization', `Bearer ${token}`).send({ name: 'Remote removed product' });
    for (const endpoint of [`/api/admin/products/${productId}`, `/api/products/${productId}`]) {
      expect((await request(app).get(endpoint).set('Authorization', `Bearer ${token}`)).body.data).toMatchObject({ remoteImage: null, images: ['/uploads/products/gallery.jpg'] });
    }
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
      for (const field of ['remoteImage', 'dimensionImage', 'featureImage']) {
        const result = await request(app).put(`/api/admin/products/${productId}`).set('Authorization', `Bearer ${token}`).send({ [field]: invalid });
        expect(result.status).toBe(400);
      }
    }
    expect((await prisma.product.findUnique({ where: { id: productId } }))?.featureImage).toBeNull();
  });

  it('does not allow anonymous visitors to upload or change product diagrams', async () => {
    expect((await request(app).post('/api/admin/products/images')).status).toBe(401);
    expect((await request(app).put(`/api/admin/products/${productId}`).send({ dimensionImage })).status).toBe(401);
  });
});
