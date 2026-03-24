/*
  Warnings:

  - The `showExplanations` column on the `Assignment` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."Assignment" DROP COLUMN "showExplanations",
ADD COLUMN     "showExplanations" BOOLEAN;
