-- Business cases move from individual products to product lines (family + line).

-- 1. Add the new key columns and copy each case's product line across
ALTER TABLE "business_cases" ADD COLUMN "product_family" TEXT,
ADD COLUMN "product_line" TEXT,
ADD COLUMN "updated_at" TIMESTAMP(3);

UPDATE "business_cases" b
SET "product_family" = p."family", "product_line" = p."product_line"
FROM "products" p
WHERE p."id" = b."product_id";

-- 2. If two products on the same line both had a case, keep the one with the
--    most P&L lines (then the newest); its lines are removed with the others
DELETE FROM "business_cases" b
USING (
  SELECT bc."id",
         ROW_NUMBER() OVER (
           PARTITION BY bc."product_family", bc."product_line"
           ORDER BY (SELECT COUNT(*) FROM "business_case_lines" l WHERE l."business_case_id" = bc."id") DESC, bc."id" DESC
         ) AS rn
  FROM "business_cases" bc
) ranked
WHERE ranked."id" = b."id" AND ranked.rn > 1;

-- Cases whose product no longer exists can't be placed on a line
DELETE FROM "business_cases" WHERE "product_family" IS NULL OR "product_line" IS NULL;

ALTER TABLE "business_cases" ALTER COLUMN "product_family" SET NOT NULL,
ALTER COLUMN "product_line" SET NOT NULL;

-- 3. Drop the old product link
ALTER TABLE "business_cases" DROP CONSTRAINT "business_cases_product_id_fkey";
DROP INDEX "business_cases_product_id_key";
ALTER TABLE "business_cases" DROP COLUMN "product_id";

CREATE UNIQUE INDEX "business_cases_product_family_product_line_key" ON "business_cases"("product_family", "product_line");
