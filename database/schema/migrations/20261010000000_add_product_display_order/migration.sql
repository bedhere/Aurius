ALTER TABLE "Product" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "Product"
SET "displayOrder" = (
  SELECT COUNT(*)
  FROM "Product" AS newer
  WHERE newer."createdAt" > "Product"."createdAt"
     OR (newer."createdAt" = "Product"."createdAt" AND newer."id" > "Product"."id")
);
