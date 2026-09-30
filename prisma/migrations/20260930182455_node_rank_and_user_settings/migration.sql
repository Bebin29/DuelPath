-- AlterTable
ALTER TABLE "ComboNode" ADD COLUMN     "rank" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "settings" JSONB NOT NULL DEFAULT '{}';
