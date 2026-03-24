-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "labId" INTEGER;

-- CreateTable
CREATE TABLE "Lab" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "blocks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignmentId" INTEGER NOT NULL,

    CONSTRAINT "Lab_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lab_assignmentId_key" ON "Lab"("assignmentId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE SET NULL ON UPDATE CASCADE;
