// Shared API types (mirror of backend responses)

export type AccountStatus =
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'REJECTED'
  | 'MORE_INFO_REQUIRED'
  | 'FROZEN'
  | 'SUSPENDED';

export type Role = 'ADMIN' | 'REGIONAL_AGENT' | 'LICENSED_TRADESMAN' | 'SUB_DEALER' | 'WATERWORKER' | 'BUILDER';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
  accountStatus: AccountStatus;
  memberLevel: number | null;
  aurId: string | null;
}

export interface MeResponse extends AuthUser {
  memberId: { aurId: string } | null;
  memberProfile: {
    firstName: string;
    lastName: string;
    companyName: string;
    state: string | null;
  } | null;
  application: unknown | null;
  applicationStatus: string | null;
  underReview: boolean;
  rejectReason: string | null;
  requestedInfo: string | null;
}

export interface PriceInfo {
  value: number;
  currency: string;
  level: number;
}

export interface ProductPrices {
  retail: number | null;
  promo: number | null;
  member: number | null;
  memberLabel: string;
  memberLevel: number;
  currency: string;
  rrp: number | null;
}

export interface ProductVariant {
  id: number;
  name: string;
  attributes: Record<string, string>;
  stock: number | null;
}

export interface ProductItem {
  id: number;
  productCode: string;
  sku: string;
  name: string;
  category: string;
  model: string | null;
  description: string;
  images: string[];
  displayStyle: string | null;
  series: string | null;
  giftable: boolean;
  promotionNote: string | null;
  dimensionSpec: string | null;
  stock: number;
  specs: Record<string, unknown> | null;
  variants: ProductVariant[];
  rrp: number | null;
  price: PriceInfo | null;
  prices: ProductPrices | null;
  priceNote: string | null;
}

export interface HomepageMediaItem {
  id: string;
  type: 'image' | 'video';
  src: string;
  poster?: string | null;
  title?: string | null;
  caption?: string | null;
  link?: string | null;
  alt?: string | null;
}

export interface DealerLocation {
  id: number;
  name: string;
  phone?: string | null;
  address: string;
  city?: string | null;
  state?: string | null;
  latitude: number;
  longitude: number;
  photos: string[];
  note?: string | null;
  active: boolean;
}

export interface SiteContent {
  company: { phone: string; email: string; address: string; hours?: string };
  homepageMedia: HomepageMediaItem[];
  dealers: DealerLocation[];
  googleMapsApiKey: string;
}

export interface PublicConfig {
  recaptchaSiteKey: string;
  paypalEnabled: boolean;
  stripeEnabled: boolean;
  sandboxPaymentsEnabled: boolean;
  appUrl: string;
  frontendUrl: string;
  googleMapsApiKey: string;
}

export interface GuestCheckoutInput {
  productId: number;
  quantity: number;
  variantId?: number | null;
  guestEmail: string;
  guestPhone?: string | null;
  shippingName: string;
  shippingPhone: string;
  shippingStreet: string;
  shippingSuburb: string;
  shippingState: string;
  shippingPostcode: string;
  shippingCountry?: string;
  shippingMethod: string;
  notes?: string | null;
}

export interface GuestOrderResult {
  orderId: number;
  orderNumber: string;
  total: number;
  guestToken: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CartItem {
  id: number;
  productId: number;
  name: string;
  sku: string;
  image: string | null;
  variantId: number | null;
  variantName: string | null;
  variantAttributes: Record<string, string> | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  stock: number;
}

export interface Cart {
  id: number;
  items: CartItem[];
  subtotal: number;
  currency: string;
}

export interface OrderListItem {
  id: number;
  orderNumber: string;
  createdAt: string;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  shipmentStatus: string;
  itemCount: number;
  firstImage: string | null;
  productSummary: string;
  trackingNumber: string | null;
}

export interface OrderDetail {
  id: number;
  orderNumber: string;
  memberAurId: string;
  status: string;
  paymentStatus: string;
  shipmentStatus: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  currency: string;
  shipping: Record<string, string | null>;
  notes: string | null;
  orderedAt: string;
  paidAt: string | null;
  items: {
    id: number;
    productId: number;
    productName: string;
    sku: string;
    variantId: number | null;
    variantName: string | null;
    variantAttributes: Record<string, string> | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  payments: {
    id: number;
    method: string;
    provider: string;
    amount: number;
    status: string;
    transactionId: string | null;
    reference: string | null;
    paidAt: string | null;
    receipts: { id: number; originalName: string; uploadedAt: string; status: string }[];
  }[];
  shipment: {
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    estimatedDelivery: string | null;
    status: string;
    shippedAt: string | null;
  } | null;
  statusHistory: { from: string | null; to: string; note: string | null; at: string; by: number | null }[];
}

export interface ApplicationDetail {
  applicationNo: string;
  channel: string;
  status: string;
  tradeType: string;
  state: string | null;
  licenceType: string | null;
  licenceNumber: string;
  firstName: string;
  lastName: string;
  companyName: string;
  streetAddress: string;
  suburb: string;
  postcode: string;
  country: string;
  phone: string;
  website: string | null;
  socialMedia: string | null;
  abnNumber: string;
  abnStatus: string;
  yearsExperience: number | null;
  smartToiletExp: string | null;
  waterPurifExp: string | null;
  additionalNotes: string | null;
  businessInterest: string | null;
  privacyConsent: boolean;
  dealerAgreement: boolean;
  marketingConsent: boolean;
  submittedAt: string;
  lastReviewedAt: string | null;
  rejectReason: string | null;
  requestedInfo: string | null;
  resubmittedAt: string | null;
  reviewLogs: { reviewTime: string; previousStatus: string; newStatus: string; reviewNotes: string | null; action: string }[];
}

export interface DownloadItem {
  id: number;
  title: string;
  description: string | null;
  category: string;
  originalName: string;
  mime: string;
  size: number;
  createdAt: string;
}

export interface Performance {
  totalOrders: number;
  totalSales: number;
  monthSales: number;
  yearSales: number;
  totalInstalledUnits: number;
  adjustments: unknown[];
  aurId: string | null;
}

export const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
export const COUNTRIES = ['Australia', 'New Zealand', 'Fiji', 'Other'];

export function money(v: number): string {
  return `AUD ${v.toFixed(2)}`;
}
