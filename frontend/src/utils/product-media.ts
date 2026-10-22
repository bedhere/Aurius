interface ProductMediaSource {
  sku?: string;
  model?: string | null;
  productCode?: string;
  images?: string[];
  image?: string | null;
  category?: string;
  remoteImage?: string | null;
}

export function usesRemoteOnlyPresentation(product: ProductMediaSource): boolean {
  return ['smart toilet', '智能马桶', '马桶'].includes(product.category?.trim().toLowerCase() ?? '');
}

export function usesWideFeaturePresentation(product: ProductMediaSource): boolean {
  return usesRemoteOnlyPresentation(product)
    || ['toilet lid', 'smart toilet seat', '马桶盖', '智能马桶盖'].includes(product.category?.trim().toLowerCase() ?? '');
}

export function productGallery(product: ProductMediaSource): string[] {
  // No body-photo or model-specific fallback: an admin deletion must stay deleted.
  if (usesRemoteOnlyPresentation(product)) return product.remoteImage ? [product.remoteImage] : [];
  return Array.isArray(product.images)
    ? product.images.filter((image) => typeof image === 'string' && image.length > 0) : [];
}

export function productThumbnail(product: ProductMediaSource): string {
  if (usesRemoteOnlyPresentation(product)) return product.remoteImage || '/favicon.svg';
  return productGallery(product)[0] ?? product.image ?? '/favicon.svg';
}
