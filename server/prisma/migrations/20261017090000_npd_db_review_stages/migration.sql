-- VBI outcome per budget review stage (DB Day 1, Day 2, Day 3, Final budget approval)
ALTER TABLE "npd_initiatives" ADD COLUMN "db_review" JSONB;

-- Carry the existing Day 1 review ("Yes - Day 1" / "No - Day 1") into the new field
UPDATE "npd_initiatives"
SET "db_review" = jsonb_build_object(
  'day1', CASE WHEN "vbi_review" ILIKE 'yes%' THEN 'Approved' WHEN "vbi_review" ILIKE 'no%' THEN 'Not approved' END
)
WHERE "vbi_review" IS NOT NULL;
