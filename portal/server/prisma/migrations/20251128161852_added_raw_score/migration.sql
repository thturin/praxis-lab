-- AlterTable
ALTER TABLE "public"."Assignment" ALTER COLUMN "isDraft" SET DEFAULT true;

-- AlterTable
ALTER TABLE "public"."Submission" ADD COLUMN     "rawScore" DOUBLE PRECISION;
