-- AlterTable
ALTER TABLE "cost_actions" ADD COLUMN     "fy" TEXT NOT NULL DEFAULT 'FY28',
ADD COLUMN     "impact_type" TEXT NOT NULL DEFAULT 'OpEx reduction',
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "cost_allocations" ALTER COLUMN "fy" SET DEFAULT 'FY28';

-- CreateIndex
CREATE INDEX "cost_actions_service_offering_idx" ON "cost_actions"("service_offering");


-- Remove the original cost figures and the dummy cost reduction actions.
-- Product lines are shown with placeholder figures until real cost data is loaded.
DELETE FROM "cost_actions";
DELETE FROM "cost_allocations";
