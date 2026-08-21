/*
  Warnings:

  - Changed the type of `plan` on the `plans` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "plansEnum" AS ENUM ('FREE', 'PRO', 'SUPER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "plans" DROP COLUMN "plan",
ADD COLUMN     "plan" "plansEnum" NOT NULL;
