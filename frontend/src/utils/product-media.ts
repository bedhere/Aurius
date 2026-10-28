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
  const images = Array.isArray(product.images) ? product.images : [];
  const gallery = usesRemoteOnlyPresentation(product) ? [product.remoteImage, ...images] : images;
  // Only use the current saved images, with the smart toilet primary image first.
  return [...new Set(gallery.filter((image): image is string => typeof image === 'string' && image.trim().length > 0).map((image) => image.trim()))];
}

export function productThumbnail(product: ProductMediaSource): string {
  return productGallery(product)[0] ?? product.image ?? '/favicon.svg';
}
