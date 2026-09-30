-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "initials" TEXT;

-- CreateIndex
CREATE INDEX "Card_initials_idx" ON "Card"("initials");

-- Kürzel für vorhandene Karten nachtragen, gleiche Regel wie initialsOf in src/lib/cards/nicknames.ts
UPDATE "Card" SET "initials" = lower((
  SELECT string_agg(left(replace(w, '''', ''), 1), '' ORDER BY ord)
  FROM regexp_split_to_table("name", '[^A-Za-z0-9'']+') WITH ORDINALITY AS t(w, ord)
  WHERE w <> ''
));
