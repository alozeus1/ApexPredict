import * as Sentry from '@sentry/nextjs';
import { writeHeartbeat } from './heartbeat';

export interface WorkerSuccess<T> {
  ok: true;
  result: T;
  durationMs: number;
}
export interface WorkerFailure {
  ok: false;
  errorClass: string;
  message: string;
  durationMs: number;
}
export type WorkerOutcome<T> = WorkerSuccess<T> | WorkerFailure;

/**
 * Run a named unit of work: time it, persist an AgentHeartbeat (live on success,
 * error on failure), drop a Sentry breadcrumb, and return a standard envelope.
 * Never throws — failures come back as `{ ok: false, errorClass, message }`.
 *
 * Staging for the S2 QStash split, where each worker runs as its own message.
 */
export async function runWorker<T>(
  name: string,
  fn: () => Promise<T>,
  opts: { message?: (result: T) => string } = {},
): Promise<WorkerOutcome<T>> {
  const started = Date.now();
  Sentry.addBreadcrumb({ category: 'worker', message: `start ${name}`, level: 'info' });
  try {
    const result = await fn();
    const durationMs = Date.now() - started;
    await writeHeartbeat(name, 'live', opts.message ? opts.message(result) : 'ok', durationMs).catch(
      () => undefined,
    );
    Sentry.addBreadcrumb({ category: 'worker', message: `done ${name} (${durationMs}ms)`, level: 'info' });
    return { ok: true, result, durationMs };
  } catch (error) {
    const durationMs = Date.now() - started;
    const errorClass = error instanceof Error ? error.constructor.name : 'UnknownError';
    const message = error instanceof Error ? error.message : 'Unknown worker error';
    await writeHeartbeat(name, 'error', message, durationMs).catch(() => undefined);
    Sentry.captureException(error);
    return { ok: false, errorClass, message, durationMs };
  }
}
