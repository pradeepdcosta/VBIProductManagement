-- AlterTable
ALTER TABLE "trading_data" ADD COLUMN     "aov_pipeline_open" DOUBLE PRECISION,
ADD COLUMN     "aov_pipeline_opened_ytd" DOUBLE PRECISION,
ADD COLUMN     "aov_target" DOUBLE PRECISION,
ADD COLUMN     "aov_won_ytd" DOUBLE PRECISION;
