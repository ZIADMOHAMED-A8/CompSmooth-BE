/*
  Warnings:

  - You are about to drop the column `propteyId` on the `Properties` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[propertyId,provider]` on the table `Properties` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `propertyId` to the `Properties` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Properties_propteyId_provider_key";

-- AlterTable
ALTER TABLE "Properties" DROP COLUMN "propteyId",
ADD COLUMN     "propertyId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Properties_propertyId_provider_key" ON "Properties"("propertyId", "provider");
