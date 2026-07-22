-- Store odds movement and queued premium alerts without changing the public
-- prediction contract.
ALTER TABLE "FixtureEnrichment" ADD COLUMN "lineupsJson" JSONB;

CREATE TABLE "OddsMovement" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "bookCode" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "previousPrice" DOUBLE PRECISION NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "movementPct" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OddsMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OddsMovement_fixtureId_capturedAt_idx" ON "OddsMovement"("fixtureId", "capturedAt");
CREATE INDEX "OddsMovement_bookCode_market_capturedAt_idx" ON "OddsMovement"("bookCode", "market", "capturedAt");

ALTER TABLE "OddsMovement"
ADD CONSTRAINT "OddsMovement_fixtureId_fkey"
FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PredictionAlert" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "channels" JSONB,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "PredictionAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PredictionAlert_dedupeKey_key" ON "PredictionAlert"("dedupeKey");
CREATE INDEX "PredictionAlert_kind_createdAt_idx" ON "PredictionAlert"("kind", "createdAt");
CREATE INDEX "PredictionAlert_status_createdAt_idx" ON "PredictionAlert"("status", "createdAt");
CREATE INDEX "PredictionAlert_fixtureId_createdAt_idx" ON "PredictionAlert"("fixtureId", "createdAt");

ALTER TABLE "PredictionAlert"
ADD CONSTRAINT "PredictionAlert_fixtureId_fkey"
FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
