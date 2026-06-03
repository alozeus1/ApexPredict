CREATE TABLE "Competition" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "externalId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Team" (
  "id" TEXT NOT NULL,
  "externalId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "shortName" TEXT,
  "tla" TEXT,
  "crestUrl" TEXT,
  "competitionId" TEXT NOT NULL,
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamStat" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "competitionId" TEXT NOT NULL,
  "form" TEXT,
  "position" INTEGER,
  "played" INTEGER,
  "won" INTEGER,
  "drawn" INTEGER,
  "lost" INTEGER,
  "goalsFor" INTEGER,
  "goalsAgainst" INTEGER,
  "goalDifference" INTEGER,
  "points" INTEGER,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamStat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Fixture" (
  "id" TEXT NOT NULL,
  "externalId" INTEGER NOT NULL,
  "competitionId" TEXT NOT NULL,
  "homeTeamId" TEXT NOT NULL,
  "awayTeamId" TEXT NOT NULL,
  "kickoff" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL,
  "matchday" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Odds" (
  "id" TEXT NOT NULL,
  "fixtureId" TEXT NOT NULL,
  "bookCode" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Odds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FixtureResult" (
  "id" TEXT NOT NULL,
  "fixtureId" TEXT NOT NULL,
  "homeScore" INTEGER NOT NULL,
  "awayScore" INTEGER NOT NULL,
  "finishedAt" TIMESTAMP(3) NOT NULL,
  "raw" JSONB NOT NULL,
  CONSTRAINT "FixtureResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PredictionSnapshot" (
  "id" TEXT NOT NULL,
  "fixtureId" TEXT NOT NULL,
  "market" TEXT NOT NULL DEFAULT '1',
  "probability" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "edge" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "elo" DOUBLE PRECISION NOT NULL,
  "poisson" DOUBLE PRECISION NOT NULL,
  "xg" DOUBLE PRECISION NOT NULL,
  "ensemble" DOUBLE PRECISION NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "topPick" TEXT NOT NULL,
  "valueBet" BOOLEAN NOT NULL DEFAULT false,
  "narrative" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PredictionSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PredictionEvaluation" (
  "id" TEXT NOT NULL,
  "predictionId" TEXT NOT NULL,
  "fixtureId" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "resultMarket" TEXT NOT NULL,
  "probability" DOUBLE PRECISION NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "impliedProbability" DOUBLE PRECISION NOT NULL,
  "edge" DOUBLE PRECISION NOT NULL,
  "stake" DOUBLE PRECISION NOT NULL,
  "returned" DOUBLE PRECISION NOT NULL,
  "profit" DOUBLE PRECISION NOT NULL,
  "hit" BOOLEAN NOT NULL,
  "brierScore" DOUBLE PRECISION NOT NULL,
  "logLoss" DOUBLE PRECISION NOT NULL,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PredictionEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PredictionBacktestRun" (
  "id" TEXT NOT NULL,
  "windowDays" INTEGER NOT NULL,
  "sampleSize" INTEGER NOT NULL,
  "hitRate" DOUBLE PRECISION NOT NULL,
  "roi" DOUBLE PRECISION NOT NULL,
  "totalStaked" DOUBLE PRECISION NOT NULL,
  "totalReturned" DOUBLE PRECISION NOT NULL,
  "netProfit" DOUBLE PRECISION NOT NULL,
  "averageConfidence" DOUBLE PRECISION NOT NULL,
  "averageEdge" DOUBLE PRECISION NOT NULL,
  "brierScore" DOUBLE PRECISION NOT NULL,
  "logLoss" DOUBLE PRECISION NOT NULL,
  "calibrationError" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PredictionBacktestRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PredictionCalibrationBucket" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "lowerBound" DOUBLE PRECISION NOT NULL,
  "upperBound" DOUBLE PRECISION NOT NULL,
  "sampleSize" INTEGER NOT NULL,
  "averageProbability" DOUBLE PRECISION NOT NULL,
  "observedRate" DOUBLE PRECISION NOT NULL,
  "calibrationError" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "PredictionCalibrationBucket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentHeartbeat" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "message" TEXT,
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentHeartbeat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Competition_externalId_key" ON "Competition"("externalId");
CREATE UNIQUE INDEX "Team_externalId_key" ON "Team"("externalId");
CREATE INDEX "Team_competitionId_idx" ON "Team"("competitionId");
CREATE INDEX "TeamStat_competitionId_capturedAt_idx" ON "TeamStat"("competitionId", "capturedAt");
CREATE INDEX "TeamStat_teamId_capturedAt_idx" ON "TeamStat"("teamId", "capturedAt");
CREATE UNIQUE INDEX "Fixture_externalId_key" ON "Fixture"("externalId");
CREATE INDEX "Fixture_kickoff_idx" ON "Fixture"("kickoff");
CREATE INDEX "Fixture_status_idx" ON "Fixture"("status");
CREATE INDEX "Fixture_competitionId_kickoff_idx" ON "Fixture"("competitionId", "kickoff");
CREATE INDEX "Odds_fixtureId_market_idx" ON "Odds"("fixtureId", "market");
CREATE INDEX "Odds_capturedAt_idx" ON "Odds"("capturedAt");
CREATE UNIQUE INDEX "FixtureResult_fixtureId_key" ON "FixtureResult"("fixtureId");
CREATE INDEX "PredictionSnapshot_fixtureId_generatedAt_idx" ON "PredictionSnapshot"("fixtureId", "generatedAt");
CREATE INDEX "PredictionSnapshot_market_generatedAt_idx" ON "PredictionSnapshot"("market", "generatedAt");
CREATE UNIQUE INDEX "PredictionEvaluation_predictionId_key" ON "PredictionEvaluation"("predictionId");
CREATE INDEX "PredictionEvaluation_fixtureId_idx" ON "PredictionEvaluation"("fixtureId");
CREATE INDEX "PredictionEvaluation_evaluatedAt_idx" ON "PredictionEvaluation"("evaluatedAt");
CREATE INDEX "PredictionEvaluation_market_evaluatedAt_idx" ON "PredictionEvaluation"("market", "evaluatedAt");
CREATE INDEX "PredictionBacktestRun_createdAt_idx" ON "PredictionBacktestRun"("createdAt");
CREATE INDEX "PredictionCalibrationBucket_runId_idx" ON "PredictionCalibrationBucket"("runId");
CREATE INDEX "AgentHeartbeat_agentId_createdAt_idx" ON "AgentHeartbeat"("agentId", "createdAt");

ALTER TABLE "Team" ADD CONSTRAINT "Team_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamStat" ADD CONSTRAINT "TeamStat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Odds" ADD CONSTRAINT "Odds_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FixtureResult" ADD CONSTRAINT "FixtureResult_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PredictionSnapshot" ADD CONSTRAINT "PredictionSnapshot_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PredictionEvaluation" ADD CONSTRAINT "PredictionEvaluation_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "PredictionSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PredictionEvaluation" ADD CONSTRAINT "PredictionEvaluation_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PredictionCalibrationBucket" ADD CONSTRAINT "PredictionCalibrationBucket_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PredictionBacktestRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
