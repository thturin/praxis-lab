-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ALTER COLUMN "name" DROP NOT NULL;
