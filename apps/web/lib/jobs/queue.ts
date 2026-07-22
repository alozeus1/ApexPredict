import { prisma, type JobKind, type JobRun } from '@apexpredix/db';

/**
 * Job queue for internal orchestration.
 *
 * Two hard constraints shape this:
 *
 * 1. **Vercel serverless caps at 300s.** Anything longer cannot complete inside
 *    a request, so it must be executed by a separate long-running worker.
 * 2. **That worker does not exist yet.** Enqueuing work nothing can execute
 *    would leave jobs QUEUED forever while the API reports success — the API
 *    equivalent of fabricating data. Long-running kinds are therefore REJECTED
 *    at enqueue until a worker is registered, with the reason stated.
 */

/** Kinds that can complete inside a Vercel request. */
const INLINE_CAPABLE: JobKind[] = ['INGESTION_REFERENCE', 'INGESTION_MATCH_DAY', 'INGESTION_RESULTS'];

/** Kinds that require a long-running worker. */
const WORKER_REQUIRED: JobKind[] = [
  'TRAINING_CHALLENGER',
  'BACKTEST',
  'MODEL_SHADOW',
  'MODEL_PROMOTE',
  'MODEL_ROLLBACK',
];

/** Worker identity in the existing AgentHeartbeat table. */
export const WORKER_AGENT_ID = 'job-worker';

/** A worker is trusted only if it has checked in this recently. */
const WORKER_HEARTBEAT_TTL_MS = 10 * 60 * 1000;

/**
 * True when a worker has checked in recently enough to be trusted with work.
 *
 * Deliberately NOT an environment flag. A flag says "someone intended a worker
 * to exist"; a heartbeat says one is actually running. If n8n is paused or its
 * credentials expire, a flag keeps accepting jobs that will never execute.
 */
export async function workerAvailable(): Promise<boolean> {
  const latest = await prisma.agentHeartbeat.findFirst({
    where: { agentId: WORKER_AGENT_ID },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest) return false;
  return Date.now() - latest.createdAt.getTime() < WORKER_HEARTBEAT_TTL_MS;
}

/** Records a worker check-in. Called by the worker on claim and heartbeat. */
export async function recordWorkerHeartbeat(claimedBy: string, message: string): Promise<void> {
  await prisma.agentHeartbeat.create({
    data: { agentId: WORKER_AGENT_ID, status: 'alive', message: `${claimedBy}: ${message}`.slice(0, 500) },
  });
}

export function requiresWorker(kind: JobKind): boolean {
  return WORKER_REQUIRED.includes(kind);
}

export function canRunInline(kind: JobKind): boolean {
  return INLINE_CAPABLE.includes(kind);
}

export type EnqueueResult =
  | { status: 'queued'; job: JobRun }
  | { status: 'existing'; job: JobRun }
  | { status: 'rejected'; reason: string };

export interface EnqueueInput {
  kind: JobKind;
  idempotencyKey: string;
  requestedBy: string;
  params: Record<string, unknown>;
}

/**
 * Enqueues a job, or returns the existing one for a replayed idempotency key.
 *
 * Replay returns `existing` rather than creating a duplicate. n8n retries on
 * timeout, and a second MODEL_PROMOTE would be a production incident.
 */
export async function enqueueJob(input: EnqueueInput): Promise<EnqueueResult> {
  const existing = await prisma.jobRun.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    // Same key, different work is a caller bug worth surfacing loudly.
    if (existing.kind !== input.kind) {
      return {
        status: 'rejected',
        reason: `idempotency key already used for a ${existing.kind} job; refusing to reuse it for ${input.kind}`,
      };
    }
    return { status: 'existing', job: existing };
  }

  if (requiresWorker(input.kind) && !(await workerAvailable())) {
    // Record the refusal so the gap is visible in the job history rather than
    // only in a 503 the caller may discard.
    const rejected = await prisma.jobRun.create({
      data: {
        kind: input.kind,
        status: 'REJECTED',
        idempotencyKey: input.idempotencyKey,
        requestedBy: input.requestedBy,
        params: input.params as never,
        error:
          `${input.kind} requires a worker (exceeds the 300s serverless limit) and no worker ` +
          `has checked in within ${WORKER_HEARTBEAT_TTL_MS / 60000} minutes. Start the n8n ` +
          'worker workflow so it claims and heartbeats.',
        finishedAt: new Date(),
      },
    });
    return { status: 'rejected', reason: rejected.error as string };
  }

  const job = await prisma.jobRun.create({
    data: {
      kind: input.kind,
      status: 'QUEUED',
      idempotencyKey: input.idempotencyKey,
      requestedBy: input.requestedBy,
      params: input.params as never,
    },
  });

  return { status: 'queued', job };
}

/**
 * Claims the next queued job of the given kinds for a worker.
 *
 * Uses a lease rather than a simple status flip so a worker that dies mid-job
 * does not strand the work. Expired leases are reclaimable.
 */
export async function claimNextJob(
  claimedBy: string,
  kinds: JobKind[],
  leaseSeconds = 900,
): Promise<JobRun | null> {
  const now = new Date();

  const candidate = await prisma.jobRun.findFirst({
    where: {
      kind: { in: kinds },
      OR: [
        { status: 'QUEUED' },
        // Reclaim a job whose worker died and whose lease has expired.
        { status: 'RUNNING', leaseUntil: { lt: now } },
      ],
    },
    orderBy: { queuedAt: 'asc' },
  });

  if (!candidate) return null;
  if (candidate.attempts >= candidate.maxAttempts) {
    await prisma.jobRun.update({
      where: { id: candidate.id },
      data: { status: 'FAILED', error: 'exceeded maxAttempts', finishedAt: now },
    });
    return null;
  }

  // Conditional update guards against two workers claiming the same row.
  const claimed = await prisma.jobRun.updateMany({
    where: {
      id: candidate.id,
      OR: [{ status: 'QUEUED' }, { status: 'RUNNING', leaseUntil: { lt: now } }],
    },
    data: {
      status: 'RUNNING',
      claimedBy,
      startedAt: candidate.startedAt ?? now,
      leaseUntil: new Date(now.getTime() + leaseSeconds * 1000),
      attempts: { increment: 1 },
    },
  });

  if (claimed.count === 0) return null;
  return prisma.jobRun.findUnique({ where: { id: candidate.id } });
}

/**
 * Records progress on a slice of a chunked job and extends the lease.
 *
 * Long work runs as a series of slices, each finishing inside the serverless
 * limit. The worker calls this between slices; the job stays RUNNING and keeps
 * its cursor so the next slice resumes rather than restarting.
 */
export async function advanceJob(
  jobId: string,
  input: { cursor: Record<string, unknown>; progress?: number; leaseSeconds?: number },
): Promise<void> {
  const leaseSeconds = input.leaseSeconds ?? 900;
  await prisma.jobRun.update({
    where: { id: jobId },
    data: {
      cursor: input.cursor as never,
      ...(input.progress !== undefined ? { progress: Math.min(100, Math.max(0, input.progress)) } : {}),
      leaseUntil: new Date(Date.now() + leaseSeconds * 1000),
    },
  });
}

export async function completeJob(jobId: string, result: Record<string, unknown>): Promise<void> {
  await prisma.jobRun.update({
    where: { id: jobId },
    data: {
      status: 'SUCCEEDED',
      result: result as never,
      progress: 100,
      finishedAt: new Date(),
      leaseUntil: null,
    },
  });
}

export async function failJob(jobId: string, error: string, retryable = true): Promise<void> {
  const job = await prisma.jobRun.findUnique({ where: { id: jobId } });
  if (!job) return;

  const exhausted = !retryable || job.attempts >= job.maxAttempts;
  await prisma.jobRun.update({
    where: { id: jobId },
    data: {
      status: exhausted ? 'FAILED' : 'QUEUED',
      // Truncated: provider errors can embed large payloads.
      error: error.slice(0, 2000),
      ...(exhausted ? { finishedAt: new Date() } : {}),
      leaseUntil: null,
      claimedBy: null,
    },
  });
}

/** Public job view. Never exposes internal lease or claim details. */
export function publicJobView(job: JobRun) {
  return {
    jobId: job.id,
    kind: job.kind,
    status: job.status,
    attempts: job.attempts,
    progress: job.progress,
    queuedAt: job.queuedAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    ...(job.error ? { error: job.error } : {}),
    ...(job.result ? { result: job.result } : {}),
  };
}
