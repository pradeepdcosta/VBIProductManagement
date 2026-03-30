-- AlterTable
ALTER TABLE "npd_initiatives" ADD COLUMN     "capex" DOUBLE PRECISION,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "opex" DOUBLE PRECISION,
ADD COLUMN     "stages" JSONB DEFAULT '{}';
