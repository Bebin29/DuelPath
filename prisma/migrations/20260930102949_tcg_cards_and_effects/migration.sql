/*
  Warnings:

  - You are about to drop the column `banlistInfo` on the `Card` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Card" DROP COLUMN "banlistInfo",
ADD COLUMN     "banTcg" TEXT,
ADD COLUMN     "descDe" TEXT,
ADD COLUMN     "effects" JSONB,
ADD COLUMN     "effectsJev" DOUBLE PRECISION,
ADD COLUMN     "effectsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nameDe" TEXT,
ADD COLUMN     "tcgDate" TIMESTAMP(3);
