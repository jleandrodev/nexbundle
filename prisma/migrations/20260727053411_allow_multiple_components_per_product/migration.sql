-- DropIndex
DROP INDEX "Relationship_shop_mainProductId_key";

-- CreateIndex
CREATE INDEX "Relationship_shop_mainProductId_idx" ON "Relationship"("shop", "mainProductId");
