import { z } from 'zod';
import { emailSchema } from './auth.schema';

export const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;
export const COUNTRIES = ['Australia', 'New Zealand', 'Fiji', 'Other'] as const;

export const tradeTypeSchema = z.enum(['LICENSED_PLUMPER', 'LICENSED_ELECTRICIAN', 'NOT_APPLICABLE']);

const applicationObject = z.object({
  channel: z.enum(['VIP', 'TRADE']),
  email: emailSchema,
  tradeType: tradeTypeSchema,
  state: z.enum(AU_STATES, { message: 'Please select an Australian state/territory' }),
  licenceType: z.enum(['INDIVIDUAL', 'COMPANY']).optional().nullable(),
  licenceNumber: z.string().max(50).optional().nullable(),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  companyName: z.string().min(1, 'Company name is required').max(200),
  streetAddress: z.string().min(1, 'Street address is required').max(200),
  suburb: z.string().min(1, 'Suburb is required').max(100),
  postcode: z.string().min(4, 'Postcode is required').max(10),
  country: z.enum(COUNTRIES).default('Australia'),
  phone: z.string().min(6, 'Phone number is required').max(20),
  website: z.string().max(300).optional().nullable(),
  socialMedia: z.string().max(300).optional().nullable(),
  abnNumber: z.string().regex(/^\d{11}$/, 'ABN must be exactly 11 digits').optional().nullable(),
  yearsExperience: z.number().int().min(1, 'Years of experience is required').max(50).optional().nullable(),
  smartToiletExp: z.string().min(1, 'Smart Toilet installation experience is required').optional(),
  waterPurifExp: z.string().min(1, 'Water purification installation experience is required').optional(),
  additionalNotes: z.string().max(4000).optional().nullable(),
  businessInterest: z.array(z.string()).min(1, 'Select at least one business category'),
  privacyConsent: z.boolean().refine((v) => v === true, { message: 'You must accept the Privacy Policy and Terms of Service' }),
  dealerAgreement: z.boolean().refine((v) => v === true, { message: 'You must accept the Trade Agreement' }),
  marketingConsent: z.boolean().default(false),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
  confirmPassword: z.string(),
  recaptchaToken: z.string().optional(),
});

export const applicationSchema = applicationObject
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .superRefine((d, ctx) => {
    // VIP channel (licensed plumber / electrician) has stricter requirements
    if (d.channel === 'VIP') {
      if (d.tradeType === 'NOT_APPLICABLE') {
        ctx.addIssue({ code: 'custom', path: ['tradeType'], message: 'Please select Licensed Plumber or Licensed Electrician' });
      }
      if (!d.licenceNumber) {
        ctx.addIssue({ code: 'custom', path: ['licenceNumber'], message: 'Licence number is required' });
      }
      if (!d.smartToiletExp) {
        ctx.addIssue({ code: 'custom', path: ['smartToiletExp'], message: 'Smart Toilet installation experience is required' });
      }
      if (!d.waterPurifExp) {
        ctx.addIssue({ code: 'custom', path: ['waterPurifExp'], message: 'Water purification installation experience is required' });
      }
    }
  });

export const resubmitApplicationSchema = applicationObject.omit({ password: true, confirmPassword: true, recaptchaToken: true, channel: true, email: true }).partial({
  tradeType: true,
}).extend({
  privacyConsent: z.boolean().refine((v) => v === true, { message: 'You must accept the Privacy Policy and Terms of Service' }),
  dealerAgreement: z.boolean().refine((v) => v === true, { message: 'You must accept the Trade Agreement' }),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
