-- CreateTable
CREATE TABLE "user_propeties" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_propeties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_propeties_userId_propertyId_key" ON "user_propeties"("userId", "propertyId");

-- CreateIndex
CREATE INDEX "user_propeties_userId_updatedAt_idx" ON "user_propeties"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "user_propeties" ADD CONSTRAINT "user_propeties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_propeties" ADD CONSTRAINT "user_propeties_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill comped properties that were recorded in usage logs before this table existed.
INSERT INTO "user_propeties" ("id", "userId", "propertyId", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::TEXT,
    "userId",
    "propertyId",
    MIN("createdAt"),
    MAX("createdAt")
FROM "Usage_logs"
WHERE "propertyId" IS NOT NULL
GROUP BY "userId", "propertyId";
