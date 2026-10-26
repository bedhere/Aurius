import { z } from 'zod';

export const dealerLocationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  phone: z.string().trim().max(50).optional().nullable(),
  address: z.string().trim().min(1, 'Address is required').max(500),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
  photos: z.array(z.string().trim().min(1).max(1000)).default([]),
  note: z.string().trim().max(2000).optional().nullable(),
  active: z.boolean().default(true),
  authorised: z.boolean().default(false),
  partnerType: z.enum(['REGIONAL_DISTRIBUTOR', 'DEALER']).default('REGIONAL_DISTRIBUTOR'),
  serviceArea: z.string().trim().max(500).optional().nullable(),
  website: z.string().trim().max(500).refine((value) => !value || /^https:\/\/[^\s]+$/i.test(value), 'Use a full HTTPS website URL').optional().nullable(),
  productCategories: z.string().trim().max(1000).optional().nullable(),
});

export type DealerLocationInput = z.infer<typeof dealerLocationSchema>;
