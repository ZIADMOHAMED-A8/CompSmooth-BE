/*
  Warnings:

  - A unique constraint covering the columns `[propteyId,provider]` on the table `Properties` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `propteyId` to the `Properties` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "providerEnum" AS ENUM ('REALTOR', 'ZILLOW', 'REDFIN');

-- AlterTable
ALTER TABLE "Properties" ADD COLUMN     "propteyId" TEXT NOT NULL,
ADD COLUMN     "provider" "providerEnum" NOT NULL DEFAULT 'REALTOR';

-- CreateIndex
CREATE UNIQUE INDEX "Properties_propteyId_provider_key" ON "Properties"("propteyId", "provider");
