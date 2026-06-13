-- Add token and submitter fields to feature_requests
ALTER TABLE "feature_requests" ADD COLUMN "token" TEXT;
ALTER TABLE "feature_requests" ADD COLUMN "submitter_name" TEXT;
ALTER TABLE "feature_requests" ADD COLUMN "submitter_email" TEXT;

-- Backfill existing rows with a UUID token
UPDATE "feature_requests" SET "token" = gen_random_uuid()::text WHERE "token" IS NULL;

-- Make token required and unique
ALTER TABLE "feature_requests" ALTER COLUMN "token" SET NOT NULL;
CREATE UNIQUE INDEX "feature_requests_token_key" ON "feature_requests"("token");
