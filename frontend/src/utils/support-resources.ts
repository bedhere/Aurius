export const RESOURCE_LABELS: Record<string, string> = {
  PRODUCT_MANUAL: 'Product Manuals',
  INSTALLATION_GUIDE: 'Installation Guides',
  TECHNICAL_SPECIFICATION: 'Technical Specifications',
  MAINTENANCE_GUIDE: 'Maintenance Guides',
  WATERMARK_CERTIFICATE: 'WaterMark Certificates',
  INSTALLATION_VIDEO: 'Installation Videos',
  WARRANTY_TERMS: 'Warranty Terms',
};

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
