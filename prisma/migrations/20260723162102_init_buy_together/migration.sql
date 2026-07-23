-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "mainProductId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "layout" TEXT NOT NULL DEFAULT 'A',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Companion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "relationshipId" TEXT NOT NULL,
    "companionProductId" TEXT NOT NULL,
    "companionVariantId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Companion_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "Relationship" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StylingConfig" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "textColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    "titleColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    "buttonColor" TEXT NOT NULL DEFAULT '#000000',
    "buttonTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    "addButtonText" TEXT NOT NULL DEFAULT 'Adicionar ambos ao carrinho',
    "titleText" TEXT NOT NULL DEFAULT 'Compre junto',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MetricEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "mainProductId" TEXT NOT NULL,
    "companionProductId" TEXT,
    "layout" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Relationship_shop_idx" ON "Relationship"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_shop_mainProductId_key" ON "Relationship"("shop", "mainProductId");

-- CreateIndex
CREATE INDEX "Companion_relationshipId_idx" ON "Companion"("relationshipId");

-- CreateIndex
CREATE INDEX "MetricEvent_shop_mainProductId_type_idx" ON "MetricEvent"("shop", "mainProductId", "type");

-- CreateIndex
CREATE INDEX "MetricEvent_shop_createdAt_idx" ON "MetricEvent"("shop", "createdAt");
