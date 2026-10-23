import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function req(key: string, fallback = ''): string {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  return v;
}

function reqBool(key: string, fallback = false): boolean {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  return v === 'true' || v === '1';
}

export const config = {
  env: req('NODE_ENV', 'development'),
  port: parseInt(req('PORT', '4000'), 10),
  appUrl: req('APP_URL', 'http://localhost:4000'),
  frontendUrl: req('FRONTEND_URL', 'http://localhost:5173'),
  jwtSecret: req('JWT_SECRET', 'dev-secret'),
  jwtAccessTtl: req('JWT_ACCESS_TTL', '2h'),
  jwtRefreshTtl: req('JWT_REFRESH_TTL', '7d'),
  aesKey: req('AES_KEY', ''),
  adminEmail: req('ADMIN_EMAIL', 'admin@aurius.com.au'),
  // One common approved-account price until separate trade tiers are enabled.
  tradePricingMode: req('TRADE_PRICING_MODE', 'uniform'),
  smtp: {
    host: req('SMTP_HOST'),
    port: parseInt(req('SMTP_PORT', '587'), 10),
    secure: reqBool('SMTP_SECURE'),
    user: req('SMTP_USER'),
    password: req('SMTP_PASSWORD'),
    from: req('MAIL_FROM', 'AURIUS <no-reply@aurius.com.au>'),
  },
  paypal: {
    clientId: req('PAYPAL_CLIENT_ID'),
    secret: req('PAYPAL_SECRET'),
    env: req('PAYPAL_ENV', 'sandbox'),
  },
  stripe: {
    secretKey: req('STRIPE_SECRET_KEY'),
    webhookSecret: req('STRIPE_WEBHOOK_SECRET'),
  },
  sandboxPayments: reqBool('SANDBOX_PAYMENTS_ENABLED', true),
  recaptcha: {
    siteKey: req('RECAPTCHA_SITE_KEY'),
    secretKey: req('RECAPTCHA_SECRET_KEY'),
  },
  abr: {
    apiKey: req('ABR_API_KEY'),
    guid: req('ABR_GUID'),
  },
  googleMaps: {
    apiKey: req('GOOGLE_MAPS_API_KEY'),
  },
  // UPLOAD_PATH is relative to the backend directory (where .env lives).
  // backend/../uploads resolves to <project>/uploads, matching the seed script.
  uploadPath: path.resolve(__dirname, '..', req('UPLOAD_PATH', '../uploads')),
  maxFileMb: parseInt(req('MAX_FILE_MB', '5'), 10),
  rateLimit: {
    windowMs: parseInt(req('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    max: parseInt(req('RATE_LIMIT_MAX', '300'), 10),
    loginMax: parseInt(req('LOGIN_RATE_LIMIT_MAX', '10'), 10),
  },
};

export function isProd(): boolean {
  return config.env === 'production';
}
