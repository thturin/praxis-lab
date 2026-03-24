/*
  Warnings:

  - Added the required column `userId` to the `Submission` table without a default value. This is not possible if the table is not empty.
  - Made the column `assignmentId` on table `Submission` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "userId" INTEGER NOT NULL,
ALTER COLUMN "assignmentId" SET NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
