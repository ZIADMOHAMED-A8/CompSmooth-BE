-- AlterTable
ALTER TABLE "Usage_logs" ADD COLUMN "propertyId" TEXT;

-- CreateIndex
CREATE INDEX "Usage_logs_userId_createdAt_idx" ON "Usage_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Usage_logs_propertyId_idx" ON "Usage_logs"("propertyId");

-- AddForeignKey
ALTER TABLE "Usage_logs" ADD CONSTRAINT "Usage_logs_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
