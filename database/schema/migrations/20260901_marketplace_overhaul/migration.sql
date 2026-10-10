-- AlterTable
ALTER TABLE "Product" ADD COLUMN "displayStyle" TEXT;
ALTER TABLE "Product" ADD COLUMN "series" TEXT;
ALTER TABLE "Product" ADD COLUMN "promotionNote" TEXT;
ALTER TABLE "Product" ADD COLUMN "dimensionSpec" TEXT;
ALTER TABLE "Product" ADD COLUMN "giftable" BOOLEAN NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductPrice" ADD COLUMN "retailPrice" REAL;
ALTER TABLE "ProductPrice" ADD COLUMN "promoPrice" REAL;
ALTER TABLE "ProductPrice" ADD COLUMN "waterworkerPrice" REAL;
ALTER TABLE "ProductPrice" ADD COLUMN "builderPrice" REAL;
ALTER TABLE "ProductPrice" ADD COLUMN "distributor2Price" REAL;
ALTER TABLE "ProductPrice" ADD COLUMN "dealer1Price" REAL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "guestToken" TEXT;
ALTER TABLE "Order" ADD COLUMN "guestEmail" TEXT;
ALTER TABLE "Order" ADD COLUMN "guestPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "lastReminderSentAt" DATETIME;

-- AlterTable
ALTER TABLE "InstallationRecord" ADD COLUMN "contactEmail" TEXT;

-- Rebuild unique indexes for nullable guest token support
CREATE UNIQUE INDEX "Order_guestToken_key" ON "Order"("guestToken");
