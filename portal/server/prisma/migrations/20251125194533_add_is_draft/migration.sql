/*
  Warnings:

  - Made the column `type` on table `Assignment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Assignment" ADD COLUMN     "isDraft" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "type" SET NOT NULL;
