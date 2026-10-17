-- AlterTable
ALTER TABLE "npd_epics" ADD COLUMN     "check_flag" TEXT,
ADD COLUMN     "epic_category" TEXT,
ADD COLUMN     "external_epic_id" INTEGER,
ADD COLUMN     "group_accountability" TEXT,
ADD COLUMN     "vbi_accountability" TEXT,
ADD COLUMN     "vbi_importance" TEXT,
ADD COLUMN     "vbi_response" TEXT,
ADD COLUMN     "vbi_target_portfolio" TEXT;

-- AlterTable
ALTER TABLE "npd_initiatives" ADD COLUMN     "ai_flag" TEXT,
ADD COLUMN     "group_owner" TEXT,
ADD COLUMN     "local_it_impact" TEXT,
ADD COLUMN     "vbi_response" TEXT,
ADD COLUMN     "vbi_review" TEXT,
ADD COLUMN     "vbi_target_portfolio" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "description" TEXT,
ADD COLUMN     "lifecycle_stage" TEXT,
ADD COLUMN     "main_lifecycle" TEXT,
ADD COLUMN     "manager_email" TEXT,
ADD COLUMN     "market" TEXT,
ADD COLUMN     "offering_id" TEXT,
ADD COLUMN     "portal_list" TEXT,
ADD COLUMN     "show_in_catalog" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "taxonomy" JSONB,
ADD COLUMN     "vbi_checked" TEXT;

-- CreateIndex
CREATE INDEX "npd_epics_initiative_id_idx" ON "npd_epics"("initiative_id");

-- CreateIndex
CREATE INDEX "npd_initiatives_fy_external_id_idx" ON "npd_initiatives"("fy", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_offering_id_key" ON "products"("offering_id");

