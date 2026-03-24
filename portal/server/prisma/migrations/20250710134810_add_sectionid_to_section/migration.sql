/*
  Warnings:

  - A unique constraint covering the columns `[sectionId]` on the table `Section` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "sectionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Section_sectionId_key" ON "Section"("sectionId");
