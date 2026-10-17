-- Replace every existing business case P&L with one generic profile (same each year FY27-FY31):
-- revenue 10 per region (30), cost of sale 3 per element (12), sales variable margin 18,
-- OpEx -1 per element (-6), CapEx -0.3 per element (-2.4). Totals are pre-calculated with the
-- portal formulas (lib/bizcase.js). Seeded narratives and NPV/RoI/IRR/payback are cleared.

DELETE FROM "business_case_lines";

INSERT INTO "business_case_lines" ("business_case_id", "section", "line_item", "sort_order", "is_total", "fy27", "fy28", "fy29", "fy30", "fy31")
SELECT b."id", v.section, v.line_item, v.sort_order, v.is_total, v.fy27, v.fy28, v.fy29, v.fy30, v.fy31
FROM "business_cases" b
CROSS JOIN (VALUES
  ('Revenue', 'Revenue - Service Recurring Americas', 1, false, 10, 10, 10, 10, 10),
  ('Revenue', 'Revenue - Service Recurring APAC', 2, false, 10, 10, 10, 10, 10),
  ('Revenue', 'Revenue - Service Recurring Others', 3, false, 10, 10, 10, 10, 10),
  ('Revenue', 'Total Service Revenue', 4, true, 30, 30, 30, 30, 30),
  ('Revenue', 'Revenue - Non Service Recurring', 5, false, NULL, NULL, NULL, NULL, NULL),
  ('Revenue', 'Revenue - Non Service Non Recurring', 6, false, NULL, NULL, NULL, NULL, NULL),
  ('Revenue', 'Total Non Service Revenue', 7, true, NULL, NULL, NULL, NULL, NULL),
  ('Revenue', 'Total Revenue', 8, true, 30, 30, 30, 30, 30),
  ('Cost of Sale', 'CoS - Service Recurring', 9, false, 3, 3, 3, 3, 3),
  ('Cost of Sale', 'CoS - Service Non Recurring', 10, false, 3, 3, 3, 3, 3),
  ('Cost of Sale', 'Total Service Cost of Sale', 11, true, 6, 6, 6, 6, 6),
  ('Cost of Sale', 'CoS - Non Service Recurring', 12, false, 3, 3, 3, 3, 3),
  ('Cost of Sale', 'CoS - Non Service Non Recurring', 13, false, 3, 3, 3, 3, 3),
  ('Cost of Sale', 'Total Non Service Cost of Sale', 14, true, 6, 6, 6, 6, 6),
  ('Cost of Sale', 'Total Cost of Sale', 15, true, 12, 12, 12, 12, 12),
  ('Margin', 'Sales variable margin - Service', 16, false, 24, 24, 24, 24, 24),
  ('Margin', 'Sales variable margin - Service %', 17, false, 80, 80, 80, 80, 80),
  ('Margin', 'Sales variable margin - Non Service', 18, false, -6, -6, -6, -6, -6),
  ('Margin', 'Sales variable margin - Non Service %', 19, false, NULL, NULL, NULL, NULL, NULL),
  ('Margin', 'Total Sales variable margin', 20, true, 18, 18, 18, 18, 18),
  ('Margin', 'Total Sales variable margin %', 21, true, 60, 60, 60, 60, 60),
  ('OpEx', 'OpEx Run & Maintain', 22, false, -1, -1, -1, -1, -1),
  ('OpEx', 'OpEx New development', 23, false, -1, -1, -1, -1, -1),
  ('OpEx', 'OpEx Operation/Market/Customer impact', 24, false, -1, -1, -1, -1, -1),
  ('OpEx', 'OpEx Market cost', 25, false, -1, -1, -1, -1, -1),
  ('OpEx', 'Customer (OpEx)', 26, false, -1, -1, -1, -1, -1),
  ('OpEx', 'VB overheads', 27, false, -1, -1, -1, -1, -1),
  ('OpEx', 'Total OpEx', 28, true, -6, -6, -6, -6, -6),
  ('EBITDA', 'EBITDA', 29, true, 12, 12, 12, 12, 12),
  ('CapEx', 'CapEx Run & Maintain', 30, false, -0.3, -0.3, -0.3, -0.3, -0.3),
  ('CapEx', 'CapEx New development', 31, false, -0.3, -0.3, -0.3, -0.3, -0.3),
  ('CapEx', 'CapEx Operation/Market/Customer impact', 32, false, -0.3, -0.3, -0.3, -0.3, -0.3),
  ('CapEx', 'CapEx Market cost', 33, false, -0.3, -0.3, -0.3, -0.3, -0.3),
  ('CapEx', 'Customer (CapEx)', 34, false, -0.3, -0.3, -0.3, -0.3, -0.3),
  ('CapEx', 'Cap OH Customer', 35, false, -0.3, -0.3, -0.3, -0.3, -0.3),
  ('CapEx', 'Cap OH Run & Maintain', 36, false, -0.3, -0.3, -0.3, -0.3, -0.3),
  ('CapEx', 'Cap OH New Development', 37, false, -0.3, -0.3, -0.3, -0.3, -0.3),
  ('CapEx', 'Total CapEx', 38, true, -2.4, -2.4, -2.4, -2.4, -2.4),
  ('Cash Flow', 'Incremental Cash flow', 39, true, 9.6, 9.6, 9.6, 9.6, 9.6),
  ('Cash Flow', 'Cash margin %', 40, true, 32, 32, 32, 32, 32)
) AS v(section, line_item, sort_order, is_total, fy27, fy28, fy29, fy30, fy31);

UPDATE "business_cases" SET "npv" = NULL, "roi" = NULL, "irr" = NULL, "payback_months" = NULL,
  "summary" = 'Generic placeholder business case (same figures for every case). Replace with the real P&L via Edit business case or the upload template.';
