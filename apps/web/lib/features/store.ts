import type { PrismaClient } from '@apexpredix/db';
import {
  assertParity,
  buildVector,
  hashSpecs,
  type BuiltVector,
  type FeatureSetDefinition,
  type FeatureValues,
} from './spec';

/**
 * Versioned feature store (gap #6, DB half).
 *
 * `ensureFeatureSet` registers (or confirms) a feature-set version and its spec
 * hash. `persistVector` writes the serving-time vector for a fixture. Training
 * reads those SAME rows back through `loadVectorsForTraining`, which refuses any
 * vector whose spec hash does not match the registered set — so a definition
 * drift becomes a loud failure at training time, not a silent accuracy leak in
 * production.
 */

/**
 * Registers a feature-set version if absent; if present, verifies the stored
 * spec hash matches the code's current specs. A mismatch means someone edited a
 * spec without bumping the version — that is refused, because it would let two
 * different definitions share one version number.
 */
export async function ensureFeatureSet(prisma: PrismaClient, def: FeatureSetDefinition) {
  const specHash = hashSpecs(def.specs);
  const existing = await prisma.featureSet.findUnique({
    where: { name_version: { name: def.name, version: def.version } },
  });

  if (!existing) {
    return prisma.featureSet.create({
      data: { name: def.name, version: def.version, specHash, specs: def.specs as never, status: 'active' },
    });
  }

  if (existing.specHash !== specHash) {
    throw new Error(
      `FeatureSet ${def.name} v${def.version} is registered with spec hash ${existing.specHash} but the code now hashes to ${specHash}. ` +
        `Bump the version instead of editing specs in place.`,
    );
  }
  return existing;
}

/**
 * Computes and persists the feature vector for a fixture under a feature set.
 * Idempotent per (fixture, set, version): re-running overwrites the same row, so
 * a retried refresh never duplicates vectors.
 */
export async function persistVector(
  prisma: PrismaClient,
  fixtureId: string,
  def: FeatureSetDefinition,
  raw: Record<string, number | null | undefined>,
) {
  const built: BuiltVector = buildVector(def.specs, raw);
  return prisma.featureVector.upsert({
    where: {
      fixtureId_featureSetName_featureSetVersion: {
        fixtureId,
        featureSetName: def.name,
        featureSetVersion: def.version,
      },
    },
    create: {
      fixtureId,
      featureSetName: def.name,
      featureSetVersion: def.version,
      specHash: built.specHash,
      values: built.values as never,
      completeness: built.completeness,
    },
    update: {
      // specHash/values/completeness are the only mutable fields; a definition
      // change would have bumped the version and hit `create`.
      specHash: built.specHash,
      values: built.values as never,
      completeness: built.completeness,
      computedAt: new Date(),
    },
  });
}

export interface TrainingRow {
  fixtureId: string;
  values: FeatureValues;
  completeness: number;
}

/**
 * Loads all vectors for a feature-set version for training, enforcing parity.
 *
 * `minCompleteness` drops thin vectors: training on rows where half the features
 * were absent teaches the model to rely on fills, which then behave differently
 * in production. The count dropped is returned so the caller can log it rather
 * than silently shrinking the training set.
 */
export async function loadVectorsForTraining(
  prisma: PrismaClient,
  def: FeatureSetDefinition,
  options: { minCompleteness?: number } = {},
): Promise<{ rows: TrainingRow[]; droppedForCompleteness: number; total: number }> {
  const minCompleteness = options.minCompleteness ?? 0.7;
  const registeredHash = hashSpecs(def.specs);

  const vectors = await prisma.featureVector.findMany({
    where: { featureSetName: def.name, featureSetVersion: def.version },
  });

  const rows: TrainingRow[] = [];
  let dropped = 0;
  for (const vector of vectors) {
    assertParity(registeredHash, vector.specHash); // throws on drift — do not swallow
    if (vector.completeness < minCompleteness) {
      dropped += 1;
      continue;
    }
    rows.push({
      fixtureId: vector.fixtureId,
      values: vector.values as FeatureValues,
      completeness: vector.completeness,
    });
  }

  return { rows, droppedForCompleteness: dropped, total: vectors.length };
}

/** Loads the serving vector for one fixture, or null. */
export async function loadVector(prisma: PrismaClient, fixtureId: string, def: FeatureSetDefinition) {
  return prisma.featureVector.findUnique({
    where: {
      fixtureId_featureSetName_featureSetVersion: {
        fixtureId,
        featureSetName: def.name,
        featureSetVersion: def.version,
      },
    },
  });
}
