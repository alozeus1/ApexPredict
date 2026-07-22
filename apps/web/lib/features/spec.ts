import { createHash } from 'node:crypto';

/**
 * Feature specifications and hashing (gap #6, pure half).
 *
 * The feature store's whole job is to make training-serving skew impossible to
 * introduce silently. That guarantee rests on one primitive: a deterministic,
 * order-sensitive hash of the feature specs. If training and serving compute the
 * same features, they produce the same `specHash`; if anyone changes a
 * definition without bumping the version, the hash changes and the mismatch is
 * caught instead of quietly corrupting the model.
 *
 * This module has NO database or network dependency so the hashing and
 * completeness rules can be unit-tested directly.
 */

export type FeatureDataType = 'number' | 'category';

/** How a missing input is handled. `none` means the feature stays null and drags completeness down. */
export type FillPolicy = 'zero' | 'mean' | 'none';

export interface FeatureSpec {
  /** Stable feature name, e.g. 'home_strength'. Used as the key in a vector. */
  name: string;
  dtype: FeatureDataType;
  /** Where the value comes from, e.g. 'standings', 'odds', 'enrichment.goals'. Documentation + provenance. */
  source: string;
  /** Optional transform label, e.g. 'zscore', 'log1p'. Part of the hash so a transform change bumps parity. */
  transform?: string;
  fillPolicy: FillPolicy;
  /** Mean used when fillPolicy = 'mean'. Frozen at training time; part of the spec so serving uses the SAME fill. */
  fillValue?: number;
}

export interface FeatureSetDefinition {
  name: string;
  version: number;
  specs: FeatureSpec[];
}

/**
 * Canonical serialisation of a spec list. Order matters and is preserved. Only
 * the fields that affect the computed value are included, so cosmetic edits
 * (notes) do not force a parity break, but any change to name/dtype/transform/
 * fill DOES.
 */
export function canonicalizeSpecs(specs: FeatureSpec[]): string {
  return JSON.stringify(
    specs.map((s) => [s.name, s.dtype, s.source, s.transform ?? '', s.fillPolicy, s.fillValue ?? null]),
  );
}

/** Deterministic content hash of the ordered specs. Same specs → same hash, always. */
export function hashSpecs(specs: FeatureSpec[]): string {
  return createHash('sha256').update(canonicalizeSpecs(specs)).digest('hex').slice(0, 32);
}

export type FeatureValues = Record<string, number | null>;

export interface BuiltVector {
  values: FeatureValues;
  /** Share of specs that resolved to a non-null value after fill. */
  completeness: number;
  specHash: string;
}

/**
 * Builds a feature vector from raw inputs, applying each spec's fill policy.
 *
 * Completeness counts a value as PRESENT only if the raw input was non-null OR a
 * deterministic fill applied ('zero'/'mean'). A 'none' fill on a missing input
 * leaves null and lowers completeness — that is the signal the publish policy
 * uses to suppress a thin prediction rather than dress it up as confident.
 */
export function buildVector(specs: FeatureSpec[], raw: Record<string, number | null | undefined>): BuiltVector {
  const values: FeatureValues = {};
  let present = 0;

  for (const spec of specs) {
    const rawValue = raw[spec.name];
    if (rawValue !== null && rawValue !== undefined && Number.isFinite(rawValue)) {
      values[spec.name] = rawValue;
      present += 1;
      continue;
    }
    // Missing — apply fill policy.
    if (spec.fillPolicy === 'zero') {
      values[spec.name] = 0;
      present += 1;
    } else if (spec.fillPolicy === 'mean' && spec.fillValue !== undefined) {
      values[spec.name] = spec.fillValue;
      present += 1;
    } else {
      values[spec.name] = null; // 'none', or 'mean' without a frozen fillValue
    }
  }

  return {
    values,
    completeness: specs.length > 0 ? present / specs.length : 0,
    specHash: hashSpecs(specs),
  };
}

export class FeatureParityError extends Error {
  constructor(
    readonly expected: string,
    readonly actual: string,
  ) {
    super(
      `Feature parity violation: vector was built under specHash ${actual} but the feature set is ${expected}. ` +
        `Training and serving would disagree — refusing to use this vector.`,
    );
    this.name = 'FeatureParityError';
  }
}

/** Throws unless a vector's specHash matches the feature set it claims to belong to. */
export function assertParity(featureSetSpecHash: string, vectorSpecHash: string): void {
  if (featureSetSpecHash !== vectorSpecHash) throw new FeatureParityError(featureSetSpecHash, vectorSpecHash);
}

// ── The v1 match-outcome feature set ──────────────────────────────────────────
//
// The concrete feature set the 1X2 engine serves today. Bump `version` and let
// the hash change whenever a spec here changes; never edit a spec in place and
// keep the same version.

export const MATCH_1X2_FEATURE_SET: FeatureSetDefinition = {
  name: 'match-1x2',
  version: 1,
  specs: [
    { name: 'home_strength', dtype: 'number', source: 'standings', fillPolicy: 'mean', fillValue: 0.5 },
    { name: 'away_strength', dtype: 'number', source: 'standings', fillPolicy: 'mean', fillValue: 0.5 },
    { name: 'strength_spread', dtype: 'number', source: 'standings', transform: 'diff', fillPolicy: 'zero' },
    { name: 'home_form', dtype: 'number', source: 'standings.form', transform: 'ewma', fillPolicy: 'none' },
    { name: 'away_form', dtype: 'number', source: 'standings.form', transform: 'ewma', fillPolicy: 'none' },
    { name: 'expected_home_goals', dtype: 'number', source: 'enrichment.goals', fillPolicy: 'none' },
    { name: 'expected_away_goals', dtype: 'number', source: 'enrichment.goals', fillPolicy: 'none' },
    { name: 'home_shots_xg', dtype: 'number', source: 'shots', transform: 'shots-xg', fillPolicy: 'none' },
    { name: 'away_shots_xg', dtype: 'number', source: 'shots', transform: 'shots-xg', fillPolicy: 'none' },
    { name: 'market_home_fair', dtype: 'number', source: 'odds', transform: 'devig', fillPolicy: 'none' },
    { name: 'market_draw_fair', dtype: 'number', source: 'odds', transform: 'devig', fillPolicy: 'none' },
    { name: 'market_away_fair', dtype: 'number', source: 'odds', transform: 'devig', fillPolicy: 'none' },
    { name: 'rest_days_home', dtype: 'number', source: 'fixtures', fillPolicy: 'none' },
    { name: 'rest_days_away', dtype: 'number', source: 'fixtures', fillPolicy: 'none' },
  ],
};
