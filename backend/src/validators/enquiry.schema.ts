import { z } from 'zod';
import { AU_STATES } from './application.schema';

const requiredText = (max: number) => z.string().trim().min(1, 'This field is required').max(max);
const email = z.string().trim().email('Please enter a valid email address').max(254);

export const contactEnquirySchema = z.object({
  name: requiredText(200),
  companyName: z.string().trim().max(200).optional().default(''),
  email,
  phone: z.string().trim().max(30).optional().default(''),
  state: z.enum(AU_STATES).optional(),
  enquiryType: z.enum(['General Enquiries', 'Trade & Business Enquiries', 'Technical & After-Sales Support']).default('General Enquiries'),
  message: requiredText(6000),
});

export const partnershipEnquirySchema = z.object({
  companyName: requiredText(200),
  state: z.enum(AU_STATES),
  city: requiredText(100),
  businessOverview: requiredText(4000),
  interestedProducts: z.array(z.enum(['Smart Toilets', 'Smart Toilet Seats', 'Whole House Water Filtration', 'Filter Cartridges', 'Custom Floor Drains'])).min(1).max(5),
  intendedTerritory: requiredText(500),
  expectedAnnualSales: requiredText(1000),
  contactName: requiredText(200),
  phone: requiredText(30).min(6, 'Please enter a valid phone number'),
  website: z.string().trim().max(300).refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.') && !/[\s@]/.test(value);
    } catch { return false; }
  }, 'Please enter a valid company website').optional().default(''),
  email,
});
