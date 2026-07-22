-- Internal job orchestration for n8n and other service callers.
--
-- Additive only: one new table and two enums. No existing table is touched.
--
-- Design note: Vercel serverless caps at 300s, so TRAINING_CHALLENGER, BACKTEST
-- and the MODEL_* kinds cannot complete inside a request. Until a long-running
-- worker is deployed, those kinds are recorded as REJECTED at enqueue rather
-- than sitting QUEUED forever while the API reports success.

CREATE TYPE "JobStatus" AS ENUM (
    'QUEUED',
    'RUNNING',
    'SUCCEEDED',
    'FAILED',
    'CANCELLED',
    'REJECTED'
);

CREATE TYPE "JobKind" AS ENUM (
    'INGESTION_REFERENCE',
    'INGESTION_MATCH_DAY',
    'INGESTION_RESULTS',
    'TRAINING_CHALLENGER',
    'BACKTEST',
    'MODEL_SHADOW',
    'MODEL_PROMOTE',
    'MODEL_ROLLBACK'
);

CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "kind" "JobKind" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "idempotencyKey" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "cursor" JSONB,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "leaseUntil" TIMESTAMP(3),
    "claimedBy" TEXT,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- Idempotency is enforced by the database, not only by application logic: an
-- n8n retry must not be able to start a second MODEL_PROMOTE under any race.
CREATE UNIQUE INDEX "JobRun_idempotencyKey_key" ON "JobRun"("idempotencyKey");

CREATE INDEX "JobRun_status_queuedAt_idx" ON "JobRun"("status", "queuedAt");
CREATE INDEX "JobRun_kind_queuedAt_idx" ON "JobRun"("kind", "queuedAt");
CREATE INDEX "JobRun_requestedBy_queuedAt_idx" ON "JobRun"("requestedBy", "queuedAt");
