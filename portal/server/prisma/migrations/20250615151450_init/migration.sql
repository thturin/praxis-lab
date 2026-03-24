/*
  Warnings:

  - You are about to drop the column `assignmentId` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the `Assignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_userId_fkey";

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "assignmentId",
DROP COLUMN "userId";

-- DropTable
DROP TABLE "Assignment";

-- DropTable
DROP TABLE "User";
