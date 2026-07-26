-- AlterTable: desconto do bundle por relacionamento
ALTER TABLE "Relationship" ADD COLUMN "discountType" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "Relationship" ADD COLUMN "discountValue" REAL NOT NULL DEFAULT 0;

-- CreateTable: desconto automático (Shopify Function) registrado na loja
CREATE TABLE "AppDiscount" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "nodeId" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
