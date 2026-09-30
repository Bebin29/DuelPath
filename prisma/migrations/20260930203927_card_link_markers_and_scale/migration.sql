-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "linkMarkers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "scale" INTEGER;
