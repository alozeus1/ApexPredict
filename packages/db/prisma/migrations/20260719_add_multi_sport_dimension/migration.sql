-- Multi-sport dimension.
--
-- Adds a sport/market-shape dimension to competitions, fixtures, odds and
-- predictions, plus the provider entity mapping table that replaces runtime
-- fuzzy name matching.
--
-- Safe on existing data: every new column is nullable-with-default or backfilled
-- to the football values the current rows already implicitly represent. No
-- existing row changes meaning.

CREATE TYPE "Sport" AS ENUM (
    'FOOTBALL',
    'BASKETBALL',
    'AMERICAN_FOOTBALL',
    'BASEBALL',
    'HOCKEY',
    'RUGBY',
    'TENNIS',
    'MMA'
);

CREATE TYPE "MarketType" AS ENUM (
    'MONEYLINE_3WAY',
    'MONEYLINE_2WAY',
    'TOTALS',
    'HANDICAP',
    'BTTS',
    'CARDS'
);

-- Every existing row is football with 1/X/2 markets, so the defaults are the
-- correct backfill value and no UPDATE pass is required.
ALTER TABLE "Competition"
    ADD COLUMN "sport" "Sport" NOT NULL DEFAULT 'FOOTBALL',
    ADD COLUMN "marketType" "MarketType" NOT NULL DEFAULT 'MONEYLINE_3WAY';

ALTER TABLE "Fixture"
    ADD COLUMN "sport" "Sport" NOT NULL DEFAULT 'FOOTBALL';

ALTER TABLE "Odds"
    ADD COLUMN "marketType" "MarketType" NOT NULL DEFAULT 'MONEYLINE_3WAY';

ALTER TABLE "PredictionSnapshot"
    ADD COLUMN "marketType" "MarketType" NOT NULL DEFAULT 'MONEYLINE_3WAY';

ALTER TABLE "PredictionEvaluation"
    ADD COLUMN "marketType" "MarketType" NOT NULL DEFAULT 'MONEYLINE_3WAY';

CREATE INDEX "Competition_sport_idx" ON "Competition"("sport");
CREATE INDEX "Fixture_sport_kickoff_idx" ON "Fixture"("sport", "kickoff");

CREATE TABLE "ProviderEntityMap" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "internalId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "sport" "Sport" NOT NULL DEFAULT 'FOOTBALL',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderEntityMap_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderEntityMap_provider_providerId_entityType_key"
    ON "ProviderEntityMap"("provider", "providerId", "entityType");
CREATE INDEX "ProviderEntityMap_internalId_provider_idx"
    ON "ProviderEntityMap"("internalId", "provider");
CREATE INDEX "ProviderEntityMap_sport_entityType_idx"
    ON "ProviderEntityMap"("sport", "entityType");

-- Seed the football-data mappings we can derive with certainty from the
-- identifiers already stored on our own rows. These are exact, not fuzzy, so
-- they are marked verified.
INSERT INTO "ProviderEntityMap" ("id", "entityType", "internalId", "provider", "providerId", "sport", "confidence", "verifiedBy", "updatedAt")
SELECT
    gen_random_uuid()::text,
    'team',
    "id",
    'football-data',
    "externalId"::text,
    'FOOTBALL',
    1.0,
    'migration:20260719',
    CURRENT_TIMESTAMP
FROM "Team"
ON CONFLICT ("provider", "providerId", "entityType") DO NOTHING;

INSERT INTO "ProviderEntityMap" ("id", "entityType", "internalId", "provider", "providerId", "sport", "confidence", "verifiedBy", "updatedAt")
SELECT
    gen_random_uuid()::text,
    'competition',
    "id",
    'football-data',
    "externalId"::text,
    'FOOTBALL',
    1.0,
    'migration:20260719',
    CURRENT_TIMESTAMP
FROM "Competition"
ON CONFLICT ("provider", "providerId", "entityType") DO NOTHING;
