/*
  Warnings:

  - You are about to drop the column `repoUrl` on the `Submission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "repoUrl",
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "url" TEXT,
ALTER COLUMN "language" DROP NOT NULL;
