-- Add nullable match-day enrichment captured by the prediction orchestration.
CREATE TABLE "FixtureEnrichment" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "weatherJson" JSONB,
    "injuriesJson" JSONB,
    "refereeJson" JSONB,
    "goalsJson" JSONB,
    "cardsJson" JSONB,
    "source" TEXT NOT NULL DEFAULT 'agentic-enrichment-v0',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixtureEnrichment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FixtureEnrichment_fixtureId_key" ON "FixtureEnrichment"("fixtureId");
CREATE INDEX "FixtureEnrichment_capturedAt_idx" ON "FixtureEnrichment"("capturedAt");

ALTER TABLE "FixtureEnrichment"
ADD CONSTRAINT "FixtureEnrichment_fixtureId_fkey"
FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
