import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './lib/errorHandler';
import { apiLimiter } from './middleware/rateLimit';

export function createApp(): Express {
  const app = express();
  app.set('trust proxy', 1);

  // --- Security headers (CSP allows self + reCAPTCHA + PayPal/Stripe) --------
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://www.google.com', 'https://www.gstatic.com', 'https://www.paypal.com', 'https://js.stripe.com'],
          frameSrc: ["'self'", 'https://www.google.com', 'https://www.paypal.com', 'https://js.stripe.com', 'https://hooks.stripe.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://www.paypalobjects.com', 'https://stripe.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://www.paypalobjects.com'],
          connectSrc: ["'self'", 'https://api-m.sandbox.paypal.com', 'https://api-m.paypal.com', 'https://api.stripe.com'],
          fontSrc: ["'self'", 'data:'],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // --- CORS: only the configured frontend origin -----------------------------
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        const allowed = [config.frontendUrl, config.appUrl];
        if (allowed.includes(origin) || config.env !== 'production') return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
    }),
  );

  // Stripe webhook needs the RAW body for signature verification
  app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }));

  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  // --- API rate limit (global) ----------------------------------------------
  app.use('/api', apiLimiter);

  // --- Static uploads (public product images; protected dirs served via API) --
  const uploadsRoot = config.uploadPath;
  fs.mkdirSync(path.join(uploadsRoot, 'brand'), { recursive: true });
  fs.mkdirSync(path.join(uploadsRoot, 'products'), { recursive: true });
  fs.mkdirSync(path.join(uploadsRoot, 'dealers'), { recursive: true });
  fs.mkdirSync(path.join(uploadsRoot, 'licences'), { recursive: true });
  fs.mkdirSync(path.join(uploadsRoot, 'receipts'), { recursive: true });
  fs.mkdirSync(path.join(uploadsRoot, 'downloads'), { recursive: true });
  // Brand, product and dealer images are publicly servable; licences/receipts/downloads
  // are accessed through authenticated controllers.
  app.use('/uploads/brand', express.static(path.join(uploadsRoot, 'brand')));
  app.use('/uploads/products', express.static(path.join(uploadsRoot, 'products')));
  app.use('/uploads/dealers', express.static(path.join(uploadsRoot, 'dealers')));

  app.use('/api', routes);

  app.get('/health', (_req, res) => {
    res.json({ success: true, message: 'AURIUS API is running', data: { env: config.env, time: new Date().toISOString() } });
  });

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Not found', errors: [] });
  });

  app.use(errorHandler);
  return app;
}
