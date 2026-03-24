/*
  Warnings:

  - You are about to drop the column `sectionId` on the `Section` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sectionCode]` on the table `Section` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Section_sectionId_key";

-- AlterTable
ALTER TABLE "public"."Section" DROP COLUMN "sectionId",
ADD COLUMN     "sectionCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Section_sectionCode_key" ON "public"."Section"("sectionCode");
