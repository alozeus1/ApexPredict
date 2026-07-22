import type { PrismaClient, Prisma } from '@apexpredix/db';
import { expectedCalibrationError, type LabelledProbability } from '@/lib/prediction-engine/calibration';
import { psi, severityFor, PSI_THRESHOLDS, type DriftSeverity } from './drift';

/**
 * Continuous calibration-health & feature-drift monitoring (gap #3, DB half).
 *
 * These are meant to run on the daily schedule. Each writes `DriftReport` rows
 * and raises a `PredictionAlert` when a breach crosses into 'warn'/'critical'.
 * The alert `dedupeKey` is bucketed by day so a persistent problem raises one
 * alert per scope per day, not one per fixture — alert fatigue hides the signal
 * as effectively as no alert at all.
 */

export interface CalibrationHealthOptions {
  /** Rolling window of settled predictions to assess. */
  windowDays?: number;
  /** ECE above this is a breach. Matches the publish policy's ceiling by default. */
  maxCalibrationError?: number;
  /** Minimum settled predictions before a scope is judged at all. */
  minSample?: number;
  /** ISO day stamp for dedupe/window bounds (injected so runs are reproducible). */
  asOf: Date;
}

function dayStamp(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function raiseAlert(
  prisma: PrismaClient,
  params: { kind: string; severity: DriftSeverity; title: string; message: string; dedupeKey: string; meta: Prisma.InputJsonValue },
) {
  // Idempotent: the unique dedupeKey means a repeated breach on the same day is a
  // no-op rather than a duplicate alert.
  await prisma.predictionAlert.upsert({
    where: { dedupeKey: params.dedupeKey },
    create: {
      kind: params.kind,
      severity: params.severity,
      title: params.title,
      message: params.message,
      dedupeKey: params.dedupeKey,
      channels: params.meta,
      status: 'queued',
    },
    update: {}, // never rewrite an existing alert
  });
}

/**
 * Recomputes rolling ECE globally and per market over the window, records a
 * DriftReport for each scope, and alerts on breach.
 */
export async function runCalibrationHealth(prisma: PrismaClient, options: CalibrationHealthOptions) {
  const windowDays = options.windowDays ?? 30;
  const maxEce = options.maxCalibrationError ?? 0.08;
  const minSample = options.minSample ?? 100;

  const windowStart = new Date(options.asOf.getTime() - windowDays * 86_400_000);
  const evaluations = await prisma.predictionEvaluation.findMany({
    where: { evaluatedAt: { gte: windowStart, lte: options.asOf } },
    select: { probability: true, hit: true, market: true },
  });

  // scope 'global' plus one per distinct market.
  const scopes = new Map<string, LabelledProbability[]>();
  scopes.set('global', []);
  for (const e of evaluations) {
    const sample: LabelledProbability = { probability: e.probability, occurred: e.hit };
    scopes.get('global')!.push(sample);
    const marketScope = `market:${e.market}`;
    if (!scopes.has(marketScope)) scopes.set(marketScope, []);
    scopes.get(marketScope)!.push(sample);
  }

  const reports: Array<{ scope: string; ece: number; sampleSize: number; severity: DriftSeverity; judged: boolean }> = [];

  for (const [scope, samples] of scopes) {
    if (samples.length < minSample) {
      reports.push({ scope, ece: 0, sampleSize: samples.length, severity: 'ok', judged: false });
      continue; // not enough evidence to judge — never alert on thin data
    }
    const ece = expectedCalibrationError(samples);
    const severity: DriftSeverity = ece > maxEce ? 'critical' : ece > maxEce * 0.75 ? 'warn' : 'ok';

    await prisma.driftReport.create({
      data: {
        kind: 'calibration',
        scope,
        metric: 'ece',
        baselineValue: maxEce,
        currentValue: ece,
        statistic: ece,
        threshold: maxEce,
        breached: severity !== 'ok',
        severity,
        sampleSize: samples.length,
        windowStart,
        windowEnd: options.asOf,
      },
    });

    if (severity !== 'ok') {
      await raiseAlert(prisma, {
        kind: 'calibration-drift',
        severity,
        title: `Calibration degraded (${scope})`,
        message: `ECE ${ece.toFixed(3)} exceeds ${maxEce} over ${windowDays}d on ${samples.length} settled predictions (${scope}).`,
        dedupeKey: `calib:${scope}:${dayStamp(options.asOf)}`,
        meta: { scope, ece, threshold: maxEce, sampleSize: samples.length },
      });
    }
    reports.push({ scope, ece, sampleSize: samples.length, severity, judged: true });
  }

  return { windowStart, windowEnd: options.asOf, reports };
}

export interface FeatureDriftOptions {
  featureSetName: string;
  featureSetVersion: number;
  /** Baseline window (training-era) vs recent window are split at this fraction of the ordered vectors. */
  baselineFraction?: number;
  /** Feature names to monitor. Defaults to every numeric key present. */
  features?: string[];
  minSamplePerSide?: number;
  asOf: Date;
}

/**
 * Compares the recent feature distribution against an earlier baseline window
 * for the same feature set, writing a PSI DriftReport per feature and alerting
 * on a significant shift. This is what catches a provider silently changing
 * units, or a league behaving unlike its training era.
 */
export async function runFeatureDrift(prisma: PrismaClient, options: FeatureDriftOptions) {
  const baselineFraction = options.baselineFraction ?? 0.5;
  const minSample = options.minSamplePerSide ?? 100;

  const vectors = await prisma.featureVector.findMany({
    where: { featureSetName: options.featureSetName, featureSetVersion: options.featureSetVersion, computedAt: { lte: options.asOf } },
    orderBy: { computedAt: 'asc' },
    select: { values: true, computedAt: true },
  });

  if (vectors.length < minSample * 2) {
    return { judged: false, reason: `only ${vectors.length} vectors; need ${minSample * 2}`, reports: [] as unknown[] };
  }

  const splitIndex = Math.floor(vectors.length * baselineFraction);
  const baselineRows = vectors.slice(0, splitIndex);
  const recentRows = vectors.slice(splitIndex);

  const featureNames =
    options.features ??
    Array.from(
      new Set(
        vectors.flatMap((v) => Object.keys((v.values as Record<string, unknown>) ?? {})),
      ),
    );

  const windowStart = baselineRows[0]!.computedAt;
  const windowEnd = options.asOf;
  const reports: Array<{ feature: string; psi: number; severity: DriftSeverity }> = [];

  for (const feature of featureNames) {
    const baseline = baselineRows
      .map((v) => (v.values as Record<string, number | null>)[feature])
      .filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
    const recent = recentRows
      .map((v) => (v.values as Record<string, number | null>)[feature])
      .filter((x): x is number => typeof x === 'number' && Number.isFinite(x));

    if (baseline.length < minSample || recent.length < minSample) continue;

    const { psi: statistic } = psi(baseline, recent);
    const severity = severityFor(statistic, PSI_THRESHOLDS);

    await prisma.driftReport.create({
      data: {
        kind: 'feature',
        scope: `feature:${feature}`,
        metric: `psi:${feature}`,
        baselineValue: PSI_THRESHOLDS.critical,
        currentValue: statistic,
        statistic,
        threshold: PSI_THRESHOLDS.warn,
        breached: severity !== 'ok',
        severity,
        sampleSize: recent.length,
        windowStart,
        windowEnd,
      },
    });

    if (severity === 'critical') {
      await raiseAlert(prisma, {
        kind: 'feature-drift',
        severity,
        title: `Feature drift: ${feature}`,
        message: `PSI ${statistic.toFixed(3)} on ${feature} (${options.featureSetName} v${options.featureSetVersion}) indicates a significant distribution shift from baseline.`,
        dedupeKey: `drift:${feature}:${dayStamp(options.asOf)}`,
        meta: { feature, psi: statistic, sampleSize: recent.length },
      });
    }
    reports.push({ feature, psi: statistic, severity });
  }

  return { judged: true, reports };
}
