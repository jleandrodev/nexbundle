-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "resetAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SupportMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "staffUserId" TEXT,
    "automated" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SupportMessage" ("body", "createdAt", "id", "sender", "shop", "staffUserId") SELECT "body", "createdAt", "id", "sender", "shop", "staffUserId" FROM "SupportMessage";
DROP TABLE "SupportMessage";
ALTER TABLE "new_SupportMessage" RENAME TO "SupportMessage";
CREATE INDEX "SupportMessage_shop_createdAt_idx" ON "SupportMessage"("shop", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
