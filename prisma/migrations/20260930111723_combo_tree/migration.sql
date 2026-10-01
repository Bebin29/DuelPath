-- CreateTable
CREATE TABLE "Combo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deckId" TEXT,
    "startState" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Combo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboNode" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "parentId" TEXT,
    "kind" TEXT NOT NULL,
    "player" TEXT NOT NULL,
    "edgeLabel" TEXT,
    "instanceId" TEXT,
    "cardId" TEXT,
    "effectIndex" INTEGER,
    "action" TEXT,
    "costMoves" JSONB NOT NULL DEFAULT '[]',
    "resolveMoves" JSONB NOT NULL DEFAULT '[]',
    "negates" JSONB,
    "optOverride" BOOLEAN,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComboNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Combo_userId_idx" ON "Combo"("userId");

-- CreateIndex
CREATE INDEX "Combo_deckId_idx" ON "Combo"("deckId");

-- CreateIndex
CREATE INDEX "ComboNode_comboId_idx" ON "ComboNode"("comboId");

-- CreateIndex
CREATE INDEX "ComboNode_parentId_idx" ON "ComboNode"("parentId");

-- AddForeignKey
ALTER TABLE "Combo" ADD CONSTRAINT "Combo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combo" ADD CONSTRAINT "Combo_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboNode" ADD CONSTRAINT "ComboNode_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboNode" ADD CONSTRAINT "ComboNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ComboNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
