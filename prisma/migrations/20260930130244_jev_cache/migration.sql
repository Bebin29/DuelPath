-- CreateTable
CREATE TABLE "JevCache" (
    "key" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JevCache_pkey" PRIMARY KEY ("key")
);
