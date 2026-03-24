/*
  Warnings:

  - Made the column `sectionCode` on table `Section` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Section" ALTER COLUMN "sectionCode" SET NOT NULL;
