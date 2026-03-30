-- CreateTable
CREATE TABLE "npd_initiatives" (
    "id" SERIAL NOT NULL,
    "external_id" INTEGER,
    "market" TEXT NOT NULL DEFAULT 'VBI',
    "portfolio" TEXT NOT NULL,
    "product_family" TEXT NOT NULL,
    "product_line" TEXT NOT NULL,
    "initiative_name" TEXT NOT NULL,
    "roadmap_category" TEXT NOT NULL,
    "roadmap_horizon" TEXT,
    "roadmap_type" TEXT,
    "fy" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "investment_canvas" TEXT,
    "primary_investment_driver" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "npd_initiatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "npd_initiatives_external_id_key" ON "npd_initiatives"("external_id");
