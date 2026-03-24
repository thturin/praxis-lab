-- CreateTable
CREATE TABLE "public"."AdminSection" (
    "userId" INTEGER NOT NULL,
    "sectionId" INTEGER NOT NULL,

    CONSTRAINT "AdminSection_pkey" PRIMARY KEY ("userId","sectionId")
);

-- AddForeignKey
ALTER TABLE "public"."AdminSection" ADD CONSTRAINT "AdminSection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminSection" ADD CONSTRAINT "AdminSection_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
