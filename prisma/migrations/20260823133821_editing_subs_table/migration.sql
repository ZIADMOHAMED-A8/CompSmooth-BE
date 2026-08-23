/*
  Warnings:

  - Added the required column `expirationDate` to the `Subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `Subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "subsStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REFUNDED');

-- AlterTable
ALTER TABLE "Subscriptions" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expirationDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" "subsStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
