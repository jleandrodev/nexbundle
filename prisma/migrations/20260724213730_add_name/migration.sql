-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Relationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "mainProductId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "layout" TEXT NOT NULL DEFAULT 'A',
    "template" TEXT NOT NULL DEFAULT 'side-by-side',
    "style" TEXT NOT NULL DEFAULT '{}',
    "direction" TEXT NOT NULL DEFAULT 'uni',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Relationship" ("createdAt", "direction", "enabled", "id", "layout", "mainProductId", "shop", "style", "template", "updatedAt") SELECT "createdAt", "direction", "enabled", "id", "layout", "mainProductId", "shop", "style", "template", "updatedAt" FROM "Relationship";
DROP TABLE "Relationship";
ALTER TABLE "new_Relationship" RENAME TO "Relationship";
CREATE INDEX "Relationship_shop_idx" ON "Relationship"("shop");
CREATE UNIQUE INDEX "Relationship_shop_mainProductId_key" ON "Relationship"("shop", "mainProductId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
