/*
  Warnings:

  - You are about to drop the column `studentId` on the `Session` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[labId,userId]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Made the column `labId` on table `Session` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_labId_fkey";

-- DropIndex
DROP INDEX "Session_labTitle_studentId_key";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "studentId",
ADD COLUMN     "userId" INTEGER NOT NULL,
ALTER COLUMN "labId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Session_labId_userId_key" ON "Session"("labId", "userId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
