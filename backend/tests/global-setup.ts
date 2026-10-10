// Global test setup: point Prisma at a disposable test database and
// reset its schema before every run.
import { execSync } from 'child_process';
import path from 'path';

export default function setup(): void {
  process.env.DATABASE_URL = 'file:./test.db';
  process.env.JWT_SECRET = 'test-secret-jwt';
  process.env.AES_KEY = '6b5c3a2d1e9f8a7b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b';
  process.env.SANDBOX_PAYMENTS_ENABLED = 'true';
  process.env.NODE_ENV = 'test';
  process.env.UPLOAD_PATH = '../uploads-test';

  const schema = path.resolve(__dirname, '../../database/schema/schema.prisma');
  execSync(`npx prisma db push --force-reset --skip-generate --schema "${schema}"`, {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe',
  });
  console.log('[test] database schema pushed');
}
