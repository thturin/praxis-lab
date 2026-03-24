-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "labTitle" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "gradedResults" JSONB NOT NULL,
    "finalScore" JSONB NOT NULL,
    "lastModified" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_labTitle_studentId_key" ON "public"."Session"("labTitle", "studentId");
