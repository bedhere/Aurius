-- Store the remote separately from the legacy gallery so it can be replaced or
-- removed without exposing toilet body photos. All presentation rules use category.
ALTER TABLE "Product" ADD COLUMN "remoteImage" TEXT;

-- One-time initial media for the existing product, never a runtime fallback.
-- Keep all dimensions and feature images (including deletions) unchanged.
UPDATE "Product"
SET "remoteImage" = '/products/nova-au-6885-remote.png'
WHERE lower(trim("category")) IN ('smart toilet', '智能马桶', '马桶')
  AND (upper(trim("sku")) = 'AU-6885'
    OR upper(trim("model")) = 'AU-6885'
    OR upper(trim("productCode")) = 'AU-6885');
