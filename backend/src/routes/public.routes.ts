import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError, ok } from '../lib/response';
import { sendMail } from '../services/mailService';
import { config } from '../config';
import { listPublicDealerLocations } from '../controllers/dealerLocationController';
import { validate, validated } from '../middleware/validate';
import { contactEnquirySchema, partnershipEnquirySchema } from '../validators/enquiry.schema';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { publicCompanyInfo } from '../lib/companyInfo';

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

const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many enquiries. Please try again later or email info@aurius.com.au.', errors: [] },
});

/** Public enquiries use the existing SMTP transport and the official inbox. */
router.post('/contact', enquiryLimiter, validate(contactEnquirySchema), async (req: Request, res: Response, next) => {
  try {
    const body = validated<z.infer<typeof contactEnquirySchema>>(req);
    const sent = await sendMail({
      to: 'info@aurius.com.au', replyTo: body.email, template: 'CONTACT_ENQUIRY', data: body,
    });
    if (!sent) throw new AppError(503, 'We could not send your enquiry. Please try again or email info@aurius.com.au.');
    ok(res, null, 'Your enquiry has been received. Our team will respond as soon as possible.');
  } catch (err) {
    next(err);
  }
});

/** Recruitment only: never creates a user, application account or ordering access. */
router.post('/partnership-enquiries', enquiryLimiter, validate(partnershipEnquirySchema), async (req: Request, res: Response, next) => {
  try {
    const body = validated<z.infer<typeof partnershipEnquirySchema>>(req);
    const sent = await sendMail({
      to: 'info@aurius.com.au', replyTo: body.email, template: 'PARTNERSHIP_ENQUIRY',
      data: { ...body, interestedProducts: body.interestedProducts.join(', ') },
    });
    if (!sent) throw new AppError(503, 'We could not send your enquiry. Please try again or email info@aurius.com.au.');
    ok(res, null, 'Your partnership enquiry has been received. Our team will review your details and contact you.');
  } catch (err) { next(err); }
});

/** System settings visible to the public (footer contact info etc.). */
router.get('/company-info', async (_req: Request, res: Response, next) => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_CONTACT' } });
    ok(res, publicCompanyInfo(parseSetting(setting?.value, null)));
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
      company: publicCompanyInfo(map.COMPANY_CONTACT),
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
