-- CreateTable
CREATE TABLE "public"."AssignmentSection" (
    "assignmentId" INTEGER NOT NULL,
    "sectionId" INTEGER NOT NULL,

    CONSTRAINT "AssignmentSection_pkey" PRIMARY KEY ("assignmentId","sectionId")
);

-- AddForeignKey
ALTER TABLE "public"."AssignmentSection" ADD CONSTRAINT "AssignmentSection_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssignmentSection" ADD CONSTRAINT "AssignmentSection_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
