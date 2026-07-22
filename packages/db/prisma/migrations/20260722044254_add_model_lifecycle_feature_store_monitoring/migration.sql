-- CreateEnum
CREATE TYPE "ModelStage" AS ENUM ('DRAFT', 'TRAINING', 'SHADOW', 'APPROVED', 'PRODUCTION', 'RETIRED', 'FAILED');

-- AlterTable
ALTER TABLE "PredictionBacktestRun" ADD COLUMN     "maxDrawdown" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "maxLosingStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "modelVersionId" TEXT;

-- AlterTable
ALTER TABLE "PredictionSnapshot" ADD COLUMN     "featureVectorId" TEXT,
ADD COLUMN     "modelVersionId" TEXT;

-- CreateTable
CREATE TABLE "ModelVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "sport" "Sport" NOT NULL DEFAULT 'FOOTBALL',
    "stage" "ModelStage" NOT NULL DEFAULT 'DRAFT',
    "gitSha" TEXT,
    "featureSetName" TEXT,
    "featureSetVersion" INTEGER,
    "params" JSONB NOT NULL DEFAULT '{}',
    "trainingWindowStart" TIMESTAMP(3),
    "trainingWindowEnd" TIMESTAMP(3),
    "trainedAt" TIMESTAMP(3),
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "promotedAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "supersedesId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelStageTransition" (
    "id" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "fromStage" "ModelStage",
    "toStage" "ModelStage" NOT NULL,
    "actor" TEXT NOT NULL,
    "reason" TEXT,
    "gate" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelStageTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelMetric" (
    "id" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "sampleSize" INTEGER NOT NULL,
    "brierScore" DOUBLE PRECISION NOT NULL,
    "logLoss" DOUBLE PRECISION NOT NULL,
    "calibrationError" DOUBLE PRECISION NOT NULL,
    "hitRate" DOUBLE PRECISION,
    "roi" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "specHash" TEXT NOT NULL,
    "specs" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureVector" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "featureSetName" TEXT NOT NULL,
    "featureSetVersion" INTEGER NOT NULL,
    "specHash" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "completeness" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureVector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShadowScore" (
    "id" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "edge" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "resultMarket" TEXT,
    "hit" BOOLEAN,
    "brierScore" DOUBLE PRECISION,
    "logLoss" DOUBLE PRECISION,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShadowScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriftReport" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "metric" TEXT NOT NULL,
    "baselineValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "statistic" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "breached" BOOLEAN NOT NULL,
    "severity" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "modelVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriftReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelComparison" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "championId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "sampleSize" INTEGER NOT NULL,
    "candidateBrier" DOUBLE PRECISION NOT NULL,
    "championBrier" DOUBLE PRECISION,
    "candidateLogLoss" DOUBLE PRECISION NOT NULL,
    "championLogLoss" DOUBLE PRECISION,
    "candidateRoi" DOUBLE PRECISION NOT NULL,
    "championRoi" DOUBLE PRECISION,
    "candidateEce" DOUBLE PRECISION NOT NULL,
    "championEce" DOUBLE PRECISION,
    "recommendation" TEXT NOT NULL,
    "reasons" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelComparison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModelVersion_name_key" ON "ModelVersion"("name");

-- CreateIndex
CREATE INDEX "ModelVersion_family_sport_stage_idx" ON "ModelVersion"("family", "sport", "stage");

-- CreateIndex
CREATE INDEX "ModelVersion_stage_idx" ON "ModelVersion"("stage");

-- CreateIndex
CREATE INDEX "ModelStageTransition_modelVersionId_createdAt_idx" ON "ModelStageTransition"("modelVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "ModelStageTransition_toStage_createdAt_idx" ON "ModelStageTransition"("toStage", "createdAt");

-- CreateIndex
CREATE INDEX "ModelMetric_modelVersionId_phase_capturedAt_idx" ON "ModelMetric"("modelVersionId", "phase", "capturedAt");

-- CreateIndex
CREATE INDEX "ModelMetric_scope_phase_capturedAt_idx" ON "ModelMetric"("scope", "phase", "capturedAt");

-- CreateIndex
CREATE INDEX "FeatureSet_name_status_idx" ON "FeatureSet"("name", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureSet_name_version_key" ON "FeatureSet"("name", "version");

-- CreateIndex
CREATE INDEX "FeatureVector_featureSetName_featureSetVersion_computedAt_idx" ON "FeatureVector"("featureSetName", "featureSetVersion", "computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureVector_fixtureId_featureSetName_featureSetVersion_key" ON "FeatureVector"("fixtureId", "featureSetName", "featureSetVersion");

-- CreateIndex
CREATE INDEX "ShadowScore_modelVersionId_createdAt_idx" ON "ShadowScore"("modelVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "ShadowScore_modelVersionId_settledAt_idx" ON "ShadowScore"("modelVersionId", "settledAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShadowScore_modelVersionId_fixtureId_market_key" ON "ShadowScore"("modelVersionId", "fixtureId", "market");

-- CreateIndex
CREATE INDEX "DriftReport_kind_createdAt_idx" ON "DriftReport"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "DriftReport_breached_createdAt_idx" ON "DriftReport"("breached", "createdAt");

-- CreateIndex
CREATE INDEX "DriftReport_scope_kind_createdAt_idx" ON "DriftReport"("scope", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "ModelComparison_candidateId_createdAt_idx" ON "ModelComparison"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "PredictionBacktestRun_modelVersionId_createdAt_idx" ON "PredictionBacktestRun"("modelVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "PredictionSnapshot_modelVersionId_generatedAt_idx" ON "PredictionSnapshot"("modelVersionId", "generatedAt");

-- AddForeignKey
ALTER TABLE "PredictionSnapshot" ADD CONSTRAINT "PredictionSnapshot_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionSnapshot" ADD CONSTRAINT "PredictionSnapshot_featureVectorId_fkey" FOREIGN KEY ("featureVectorId") REFERENCES "FeatureVector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionBacktestRun" ADD CONSTRAINT "PredictionBacktestRun_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelVersion" ADD CONSTRAINT "ModelVersion_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "ModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelStageTransition" ADD CONSTRAINT "ModelStageTransition_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelMetric" ADD CONSTRAINT "ModelMetric_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureVector" ADD CONSTRAINT "FeatureVector_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShadowScore" ADD CONSTRAINT "ShadowScore_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShadowScore" ADD CONSTRAINT "ShadowScore_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelComparison" ADD CONSTRAINT "ModelComparison_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ModelVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelComparison" ADD CONSTRAINT "ModelComparison_championId_fkey" FOREIGN KEY ("championId") REFERENCES "ModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
