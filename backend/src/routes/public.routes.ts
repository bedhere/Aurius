import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok } from '../lib/response';
import { sendMail } from '../services/mailService';
import { config } from '../config';
import { listPublicDealerLocations } from '../controllers/dealerLocationController';

function parseSetting<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

const router = Router();

/** Public config exposed to the frontend (no secrets). */
router.get('/config', (_req: Request, res: Response) => {
  ok(res, {
    recaptchaSiteKey: config.recaptcha.siteKey || '',
    paypalEnabled: Boolean(config.paypal.clientId && config.paypal.secret),
    stripeEnabled: Boolean(config.stripe.secretKey),
    sandboxPaymentsEnabled: config.sandboxPayments && config.env !== 'production',
    appUrl: config.appUrl,
    frontendUrl: config.frontendUrl,
    googleMapsApiKey: config.googleMaps.apiKey || '',
  });
});

/** Contact form → emailed to the operations mailbox. */
router.post('/contact', async (req: Request, res: Response, next) => {
  try {
    const body = req.body as { name: string; email: string; phone?: string; subject?: string; message: string };
    if (!body.name || !body.email || !body.message) {
      res.status(400).json({ success: false, message: 'Name, email and message are required', errors: [] });
      return;
    }
    const opsEmail = process.env.ADMIN_EMAIL || config.adminEmail;
    await sendMail({
      to: opsEmail,
      template: 'SECURITY_ALERT', // reuse simple notification layout
      data: {
        details: `New website enquiry from ${body.name} (${body.email}${body.phone ? `, ${body.phone}` : ''}): ${body.message}`,
      },
    });
    ok(res, null, 'Thank you for contacting AURIUS. Our team will get back to you shortly.');
  } catch (err) {
    next(err);
  }
});

/** System settings visible to the public (footer contact info etc.). */
router.get('/company-info', async (_req: Request, res: Response, next) => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_CONTACT' } });
    ok(
      res,
      setting
        ? (() => { try { return JSON.parse(setting.value); } catch { return null; } })()
        : { phone: '+61 2 8000 0000', email: config.adminEmail, address: 'Sydney NSW, Australia' },
    );
  } catch (err) {
    next(err);
  }
});

router.get('/site-content', async (_req: Request, res: Response, next) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ['COMPANY_CONTACT', 'HOMEPAGE_MEDIA', 'DEALER_LOCATIONS'] } },
    });
    const map = Object.fromEntries(settings.map((setting) => [setting.key, parseSetting(setting.value, null)]));
    ok(res, {
      company: map.COMPANY_CONTACT ?? { phone: '+61 2 8000 0000', email: config.adminEmail, address: 'Sydney NSW, Australia' },
      homepageMedia: Array.isArray(map.HOMEPAGE_MEDIA) ? map.HOMEPAGE_MEDIA : [],
      dealers: Array.isArray(map.DEALER_LOCATIONS) ? map.DEALER_LOCATIONS : [],
      googleMapsApiKey: config.googleMaps.apiKey || '',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/dealers', listPublicDealerLocations);

export default router;
