import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok } from '../lib/response';
import { config } from '../config';
import { listPublicDealerLocations } from '../controllers/dealerLocationController';
import { validate } from '../middleware/validate';
import { contactEnquirySchema, partnershipEnquirySchema } from '../validators/enquiry.schema';
import rateLimit from 'express-rate-limit';
import { publicCompanyInfo } from '../lib/companyInfo';
import { contactEnquiry, partnershipEnquiry, supportEnquiry } from '../controllers/websiteEnquiryController';
import { listPublicResources, publicResourceFile } from '../controllers/supportResourceController';
import { docUpload, uploadSub } from '../middleware/upload';

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
  windowMs: 15 * 60 * 1000, max: config.env === 'test' ? 1000 : 10, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many enquiries. Please try again later or email info@aurius.com.au.', errors: [] },
});

router.post('/contact', enquiryLimiter, validate(contactEnquirySchema), contactEnquiry);
router.post('/partnership-enquiries', enquiryLimiter, validate(partnershipEnquirySchema), partnershipEnquiry);
router.post('/support/requests', enquiryLimiter, uploadSub('support'), docUpload.fields([{ name: 'images', maxCount: 4 }, { name: 'proof', maxCount: 1 }]), supportEnquiry);
router.get('/support/resources', listPublicResources);
router.get('/support/resources/:id/file', publicResourceFile);
router.get('/vision-media', async (_req, res, next) => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'VISION_MEDIA' } });
    const media = parseSetting<{ src?: string; alt?: string } | null>(setting?.value, null);
    ok(res, media?.src?.startsWith('/uploads/brand/') ? media : null);
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
