-- CreateTable
CREATE TABLE "Banlist" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effectiveOn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BanlistCard" (
    "id" TEXT NOT NULL,
    "banlistId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "BanlistCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Banlist_key_key" ON "Banlist"("key");

-- CreateIndex
CREATE INDEX "BanlistCard_cardId_idx" ON "BanlistCard"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "BanlistCard_banlistId_cardId_key" ON "BanlistCard"("banlistId", "cardId");

-- AddForeignKey
ALTER TABLE "BanlistCard" ADD CONSTRAINT "BanlistCard_banlistId_fkey" FOREIGN KEY ("banlistId") REFERENCES "Banlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BanlistCard" ADD CONSTRAINT "BanlistCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
