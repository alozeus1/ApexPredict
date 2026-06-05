-- Migration: add_userpick_clean_model_odds
--
-- 1) Add the UserPick model (user-tracked bets; UI in S3).
-- 2) Remove legacy synthetic odds rows. The engine no longer persists a fair
--    price (it returns MODEL_FAIR_PRICE in-memory only); this clears any rows
--    written under the old `bookCode = 'MODEL'` behaviour. Safe + idempotent.

-- CreateEnum
CREATE TYPE "PickResult" AS ENUM ('WIN', 'LOSS', 'VOID', 'PENDING');

-- CreateTable
CREATE TABLE "UserPick" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "stake" DOUBLE PRECISION NOT NULL,
    "bookCode" TEXT,
    "price" DOUBLE PRECISION,
    "result" "PickResult" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "UserPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserPick_userId_createdAt_idx" ON "UserPick"("userId", "createdAt");
CREATE INDEX "UserPick_fixtureId_idx" ON "UserPick"("fixtureId");

-- Data cleanup: drop synthetic model prices that should never have been stored.
DELETE FROM "Odds" WHERE "bookCode" = 'MODEL';
DELETE FROM "Odds" WHERE "bookCode" = 'MODEL_FAIR_PRICE';
