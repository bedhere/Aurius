import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import { unlink } from 'node:fs/promises';
import { buildApp, createUser, loginAgent, prisma } from './helpers';
import { config } from '../src/config';

describe('editable homepage carousel', () => {
  const app = buildApp();
  let adminToken: string;
  let memberToken: string;
  let uploadedUrl: string;
  const uploadedFiles: string[] = [];

  beforeAll(async () => {
    const suffix = Date.now();
    const adminEmail = `homepage-admin-${suffix}@test.com.au`;
    const memberEmail = `homepage-member-${suffix}@test.com.au`;
    await createUser(adminEmail, 'ADMIN');
    await createUser(memberEmail, 'LICENSED_TRADESMAN');
    adminToken = (await loginAgent(app, adminEmail)).token;
    memberToken = (await loginAgent(app, memberEmail)).token;
  });

  afterAll(async () => {
    await Promise.all(uploadedFiles.map((file) => unlink(file)));
    await prisma.$disconnect();
  });

  it('limits homepage uploads and settings changes to administrators', async () => {
    expect((await request(app).post('/api/admin/settings/homepage-images')).status).toBe(401);
    expect((await request(app).post('/api/admin/settings/homepage-images').set('Authorization', `Bearer ${memberToken}`)).status).toBe(403);
    expect((await request(app).put('/api/admin/settings').set('Authorization', `Bearer ${memberToken}`).send({ HOMEPAGE_MEDIA: [] })).status).toBe(403);
  });

  it('uploads a homepage image to the public brand directory', async () => {
    const result = await request(app).post('/api/admin/settings/homepage-images')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', path.resolve(__dirname, '../../frontend/public/brand/quality-strip.png'));
    expect(result.status).toBe(200);
    uploadedUrl = result.body.data.url;
    expect(uploadedUrl).toMatch(/^\/uploads\/brand\/[\w-]+\.png$/);
    uploadedFiles.push(path.join(config.uploadPath, 'brand', path.basename(uploadedUrl)));
    const asset = await request(app).get(uploadedUrl);
    expect(asset.status).toBe(200);
    expect(asset.headers['content-type']).toMatch(/^image\/png/);
  });

  it('keeps all original slides when adding an image and persists reorder and removal', async () => {
    const originals = [1, 2, 3, 4].map((index) => ({
      id: `hero-${index}`, type: 'image', src: `/uploads/brand/home-banner-${index}.png`,
    }));
    const added = { id: 'new-slide', type: 'image', src: uploadedUrl, alt: 'New campaign' };
    const save = async (media: object[]) => request(app).put('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`).send({ HOMEPAGE_MEDIA: media });
    expect((await save([...originals, added])).status).toBe(200);
    const admin = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${adminToken}`);
    expect(admin.body.data.HOMEPAGE_MEDIA).toEqual([...originals, added]);
    expect((await request(app).get('/api/site-content')).body.data.homepageMedia).toEqual([...originals, added]);
    const reordered = [added, ...originals.slice(1)];
    expect((await save(reordered)).status).toBe(200);
    expect((await request(app).get('/api/site-content')).body.data.homepageMedia).toEqual(reordered);
  });

  it('rejects missing files and unsupported upload formats', async () => {
    const endpoint = '/api/admin/settings/homepage-images';
    expect((await request(app).post(endpoint).set('Authorization', `Bearer ${adminToken}`)).status).toBe(400);
    const result = await request(app).post(endpoint).set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), { filename: 'banner.svg', contentType: 'image/svg+xml' });
    expect(result.status).toBe(400);
  });
});
