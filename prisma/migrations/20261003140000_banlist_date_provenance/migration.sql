-- Keep fetch timestamps separate from official effective dates.
ALTER TABLE "Banlist" ALTER COLUMN "effectiveOn" DROP NOT NULL;
ALTER TABLE "Banlist" ADD COLUMN "importedAt" TIMESTAMP(3);
-- Existing current dates were inferred from the database version; they are not verified.
UPDATE "Banlist" SET "effectiveOn" = NULL WHERE "key" = 'current';
