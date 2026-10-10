-- CreateTable
CREATE TABLE "DealerLocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
