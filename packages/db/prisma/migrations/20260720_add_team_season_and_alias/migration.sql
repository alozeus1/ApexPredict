-- Season-accurate team membership, plus recorded club aliases.
--
-- Additive only: two new tables. Nothing existing is altered, and no data is
-- backfilled.
--
-- Deliberately NOT backfilled from fixture dates. Season boundaries differ by
-- country — European leagues straddle two calendar years, Brazil's Serie A does
-- not — so deriving membership from a kickoff date would place clubs in seasons
-- they never played. Rows are instead written from the provider's authoritative
-- team-per-season list during `seed-provider-mappings --write`.
--
-- Until populated, mapping coverage is measured against the unscoped roster and
-- the seed script says so explicitly rather than reporting a flattering number.

CREATE TABLE "TeamSeason" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamSeason_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamSeason_teamId_competitionId_season_key"
    ON "TeamSeason"("teamId", "competitionId", "season");
CREATE INDEX "TeamSeason_competitionId_season_idx"
    ON "TeamSeason"("competitionId", "season");

ALTER TABLE "TeamSeason"
    ADD CONSTRAINT "TeamSeason_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamSeason"
    ADD CONSTRAINT "TeamSeason_competitionId_fkey"
    FOREIGN KEY ("competitionId") REFERENCES "Competition"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TeamAlias" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamAlias_teamId_alias_key" ON "TeamAlias"("teamId", "alias");
CREATE INDEX "TeamAlias_alias_idx" ON "TeamAlias"("alias");

ALTER TABLE "TeamAlias"
    ADD CONSTRAINT "TeamAlias_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed aliases we already hold with certainty. shortName and tla are fields
-- Football-Data publishes FOR that team — no inference, no matching. They are
-- therefore safe to match on, which is what a non-null verifiedBy means here.
--
-- verifiedBy names the provider field rather than a person, because no person
-- checked these. It must not read like a human review that did not happen.
INSERT INTO "TeamAlias" ("id", "teamId", "alias", "source", "verifiedBy")
SELECT gen_random_uuid()::text, "id", "shortName", 'football-data:shortName', 'football-data-official-field'
FROM "Team"
WHERE "shortName" IS NOT NULL AND "shortName" <> '' AND "shortName" <> "name"
ON CONFLICT ("teamId", "alias") DO NOTHING;

INSERT INTO "TeamAlias" ("id", "teamId", "alias", "source", "verifiedBy")
SELECT gen_random_uuid()::text, "id", "tla", 'football-data:tla', 'football-data-official-field'
FROM "Team"
WHERE "tla" IS NOT NULL AND "tla" <> '' AND "tla" <> "name"
ON CONFLICT ("teamId", "alias") DO NOTHING;
