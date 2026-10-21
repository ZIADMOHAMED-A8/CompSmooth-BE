-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('SIGN_UP', 'PASSWORD_RESET', 'EMAIL_VERIFICATION');

-- CreateTable
CREATE TABLE "OTPs" (
    "id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OTPs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OTPs_destination_purpose_expiresAt_idx" ON "OTPs"("destination", "purpose", "expiresAt");

-- CreateIndex
CREATE INDEX "OTPs_expiresAt_idx" ON "OTPs"("expiresAt");
