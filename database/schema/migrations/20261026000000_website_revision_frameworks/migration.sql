ALTER TABLE "DealerLocation" ADD COLUMN "authorised" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DealerLocation" ADD COLUMN "partnerType" TEXT NOT NULL DEFAULT 'REGIONAL_DISTRIBUTOR';
ALTER TABLE "DealerLocation" ADD COLUMN "serviceArea" TEXT;
ALTER TABLE "DealerLocation" ADD COLUMN "website" TEXT;
ALTER TABLE "DealerLocation" ADD COLUMN "productCategories" TEXT;

CREATE TABLE "SupportResource" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "productId" INTEGER,
  "certificateNumber" TEXT NOT NULL DEFAULT '',
  "certificationScope" TEXT NOT NULL DEFAULT '',
  "filePath" TEXT,
  "originalName" TEXT,
  "mime" TEXT,
  "size" INTEGER NOT NULL DEFAULT 0,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "SupportResource_published_category_idx" ON "SupportResource"("published", "category");

CREATE TABLE "WebsiteEnquiry" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "reference" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL,
  "data" TEXT NOT NULL,
  "attachments" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "notes" TEXT NOT NULL DEFAULT '',
  "notificationSent" BOOLEAN NOT NULL DEFAULT false,
  "confirmationSent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "WebsiteEnquiry_reference_key" ON "WebsiteEnquiry"("reference");
CREATE INDEX "WebsiteEnquiry_kind_state_status_idx" ON "WebsiteEnquiry"("kind", "state", "status");
