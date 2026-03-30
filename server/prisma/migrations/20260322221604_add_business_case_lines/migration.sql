-- AlterTable
ALTER TABLE "business_cases" ADD COLUMN     "roi" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "business_case_lines" (
    "id" SERIAL NOT NULL,
    "business_case_id" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "line_item" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_total" BOOLEAN NOT NULL DEFAULT false,
    "fy27" DOUBLE PRECISION,
    "fy28" DOUBLE PRECISION,
    "fy29" DOUBLE PRECISION,
    "fy30" DOUBLE PRECISION,
    "fy31" DOUBLE PRECISION,

    CONSTRAINT "business_case_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_case_lines_business_case_id_section_line_item_key" ON "business_case_lines"("business_case_id", "section", "line_item");

-- AddForeignKey
ALTER TABLE "business_case_lines" ADD CONSTRAINT "business_case_lines_business_case_id_fkey" FOREIGN KEY ("business_case_id") REFERENCES "business_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
