/*
  Warnings:

  - Made the column `showExplanations` on table `Assignment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Assignment" ALTER COLUMN "showExplanations" SET NOT NULL,
ALTER COLUMN "showExplanations" SET DEFAULT false;
