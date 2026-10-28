export const RESOURCE_LABELS: Record<string, string> = {
  PRODUCT_MANUAL: 'Product Manuals',
  INSTALLATION_GUIDE: 'Installation Guides',
  TECHNICAL_SPECIFICATION: 'Technical Specifications',
  MAINTENANCE_GUIDE: 'Repair Guides',
  WATERMARK_CERTIFICATE: 'WaterMark Certificates',
  INSTALLATION_VIDEO: 'Installation Videos',
  PRODUCT_FEATURE_VIDEO: 'Product Feature Videos',
  WARRANTY_TERMS: 'Warranty Terms',
};

export function isVideoResourceCategory(category: string): boolean {
  return category === 'INSTALLATION_VIDEO' || category === 'PRODUCT_FEATURE_VIDEO';
}

export function resourceFileAccept(category: string): string {
  if (category === 'MAINTENANCE_GUIDE') return '.pdf,.jpg,.jpeg,.png,.mp4,.webm';
  return isVideoResourceCategory(category) ? '.mp4,.webm' : '.pdf,.jpg,.jpeg,.png';
}

export interface SupportResource {
  id: number;
  title: string;
  description: string;
  category: string;
  productId: number | null;
  product?: { id: number; name: string; model: string | null } | null;
  certificateNumber: string;
  certificationScope: string;
  fileUrl: string;
  originalName: string | null;
  mime: string | null;
  hasFile: boolean;
  published: boolean;
}
