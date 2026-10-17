-- DropIndex
DROP INDEX "cost_allocations_service_offering_fy_key";

-- AlterTable
ALTER TABLE "cost_allocations" ADD COLUMN     "breakdown" JSONB,
ADD COLUMN     "updated_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "cost_allocations_service_tower_service_offering_fy_key" ON "cost_allocations"("service_tower", "service_offering", "fy");

