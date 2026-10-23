import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'test-secret-jwt',
      AES_KEY: '6b5c3a2d1e9f8a7b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b',
      SANDBOX_PAYMENTS_ENABLED: 'true',
      NODE_ENV: 'test',
      // Keep regression coverage of the existing optional tiered pricing mode.
      // enquiry-revision.test.ts also verifies the current uniform mode.
      TRADE_PRICING_MODE: 'tiered',
      SMTP_HOST: '',
      UPLOAD_PATH: '../uploads-test',
      RECAPTCHA_SECRET_KEY: '',
      PAYPAL_CLIENT_ID: '',
      STRIPE_SECRET_KEY: '',
      LOGIN_RATE_LIMIT_MAX: '1000',
      RATE_LIMIT_MAX: '10000',
    },
    globalSetup: ['./tests/global-setup.ts'],
    testTimeout: 30000,
    hookTimeout: 120000,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
