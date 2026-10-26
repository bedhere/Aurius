import { z } from 'zod';
import { AU_STATES } from './application.schema';

const requiredText = (max: number) => z.string().trim().min(1, 'This field is required').max(max);
const email = z.string().trim().email('Please enter a valid email address').max(254);

export const contactEnquirySchema = z.object({
  name: requiredText(200),
  companyName: z.string().trim().max(200).optional().default(''),
  email,
  phone: requiredText(30).min(6, 'Please enter a valid phone number'),
  state: z.enum(AU_STATES),
  enquiryType: z.enum(['General Enquiries', 'Product Enquiries', 'Trade & Business Enquiries', 'Technical Support', 'Warranty & After-Sales', 'Technical & After-Sales Support']).default('General Enquiries'),
  message: requiredText(6000),
});

export const partnershipEnquirySchema = z.object({
  companyName: requiredText(200),
  abn: z.string().trim().regex(/^\d{11}$/, 'ABN must be exactly 11 digits'),
  yearsInBusiness: z.string().trim().max(3).regex(/^\d{0,3}$/, 'Enter whole years in business').optional().default(''),
  existingSalesNetwork: z.string().trim().max(2000).optional().default(''),
  partnershipType: z.enum(['Regional Distributor', 'Dealer / Reseller', 'Other Business Partnership']),
  currentAnnualSales: z.string().trim().max(1000).optional().default(''),
  state: z.enum(AU_STATES),
  city: requiredText(100),
  businessOverview: requiredText(4000),
  interestedProducts: z.array(z.enum(['Smart Toilets', 'Smart Toilet Seats', 'Whole House Water Filtration', 'Filter Cartridges', 'Custom Floor Drains'])).min(1).max(5),
  intendedTerritory: requiredText(500),
  expectedAnnualSales: z.string().trim().max(1000).optional().default(''),
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

export const supportEnquirySchema = z.object({
  name: requiredText(200),
  email,
  phone: requiredText(30).min(6, 'Please enter a valid phone number'),
  productModel: requiredText(200),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid purchase date').refine((value) => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10);
  }, 'Enter a valid purchase date that is not in the future'),
  orderNumber: z.string().trim().max(200).optional().default(''),
  message: requiredText(6000),
});
