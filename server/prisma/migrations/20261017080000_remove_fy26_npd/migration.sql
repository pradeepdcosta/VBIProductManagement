-- Remove the FY26 NPD cycle: its epics (checklist items cascade) and its initiatives.
-- Epics reference initiatives by id text, so they are removed explicitly first.
DELETE FROM "npd_epics" e
USING "npd_initiatives" i
WHERE e."initiative_id" = i."id"::text AND i."fy" = 'FY26';

DELETE FROM "npd_initiatives" WHERE "fy" = 'FY26';
