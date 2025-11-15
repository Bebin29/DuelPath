-- CreateTable
CREATE TABLE "ComboVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comboId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deckId" TEXT,
    "snapshot" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    CONSTRAINT "ComboVersion_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ComboVersion_comboId_idx" ON "ComboVersion"("comboId");

-- CreateIndex
CREATE INDEX "ComboVersion_comboId_version_idx" ON "ComboVersion"("comboId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ComboVersion_comboId_version_key" ON "ComboVersion"("comboId", "version");
