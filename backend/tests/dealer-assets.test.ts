import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app';
import { config } from '../src/config';

describe('dealer photo hosting', () => {
  const fileName = `dealer-photo-test-${process.pid}.svg`;
  const photoPath = path.join(config.uploadPath, 'dealers', fileName);
  const privatePath = path.join(config.uploadPath, 'licences', fileName);
  const app = createApp();

  beforeAll(async () => {
    await mkdir(path.dirname(photoPath), { recursive: true });
    await mkdir(path.dirname(privatePath), { recursive: true });
    await writeFile(photoPath, '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
    await writeFile(privatePath, 'private test fixture');
  });

  afterAll(async () => {
    await Promise.all([unlink(photoPath), unlink(privatePath)]);
  });

  it('serves dealer photos anonymously as image assets', async () => {
    const response = await request(app).get(`/uploads/dealers/${fileName}`);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^image\/svg\+xml/);
  });

  it('keeps private uploads inaccessible alongside public dealer photos', async () => {
    const response = await request(app).get(`/uploads/licences/${fileName}`);
    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain('private test fixture');
  });
});
