-- CreateTable
CREATE TABLE "DeckGame" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "sidePlanId" TEXT,
    "matchup" TEXT NOT NULL,
    "going" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "note" TEXT,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeckGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeckGame_deckId_idx" ON "DeckGame"("deckId");

-- AddForeignKey
ALTER TABLE "DeckGame" ADD CONSTRAINT "DeckGame_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
