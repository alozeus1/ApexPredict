import type { PrismaClient } from '@apexpredix/db';

/**
 * Provider entity resolution.
 *
 * Runtime fuzzy name matching is not safe for this product. Club names in
 * African and lower-tier competitions vary enough between vendors that a
 * substring match will confidently return the wrong team, and a wrong team
 * silently corrupts every downstream signal — injuries attributed to the wrong
 * squad, odds attached to the wrong fixture.
 *
 * So resolution is table-driven. Fuzzy matching exists only to PROPOSE
 * candidates for human verification; it never satisfies a lookup on its own.
 */

export type EntityType = 'team' | 'competition' | 'player';

export interface ResolvedEntity {
  internalId: string;
  providerId: string;
  confidence: number;
  verified: boolean;
}

export type ResolutionOutcome =
  | { status: 'resolved'; entity: ResolvedEntity }
  | { status: 'unverified'; entity: ResolvedEntity; reason: string }
  | { status: 'unmapped'; reason: string };

/**
 * Resolves an internal entity to its provider identifier.
 *
 * Returns `unverified` — NOT `resolved` — for auto-matched rows that no human
 * has confirmed. Callers must treat `unverified` the same way the enrichment
 * layer treats a missing feed: record it as unavailable rather than use it.
 */
export async function resolveProviderId(
  prisma: PrismaClient,
  params: { internalId: string; provider: string; entityType: EntityType },
): Promise<ResolutionOutcome> {
  const row = await prisma.providerEntityMap.findFirst({
    where: {
      internalId: params.internalId,
      provider: params.provider,
      entityType: params.entityType,
    },
    orderBy: [{ verifiedBy: 'desc' }, { confidence: 'desc' }],
  });

  if (!row) {
    return {
      status: 'unmapped',
      reason: `no ${params.provider} mapping for ${params.entityType} ${params.internalId}`,
    };
  }

  const entity: ResolvedEntity = {
    internalId: row.internalId,
    providerId: row.providerId,
    confidence: row.confidence,
    verified: row.verifiedBy !== null,
  };

  if (!entity.verified) {
    return {
      status: 'unverified',
      entity,
      reason: `mapping for ${params.entityType} ${params.internalId} is auto-matched and unverified`,
    };
  }

  return { status: 'resolved', entity };
}

/** Batch form of {@link resolveProviderId}, keyed by internal id. */
export async function resolveProviderIds(
  prisma: PrismaClient,
  params: { internalIds: string[]; provider: string; entityType: EntityType },
): Promise<Map<string, ResolutionOutcome>> {
  const output = new Map<string, ResolutionOutcome>();
  if (params.internalIds.length === 0) return output;

  const rows = await prisma.providerEntityMap.findMany({
    where: {
      internalId: { in: params.internalIds },
      provider: params.provider,
      entityType: params.entityType,
    },
    orderBy: [{ verifiedBy: 'desc' }, { confidence: 'desc' }],
  });

  const byInternalId = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!byInternalId.has(row.internalId)) byInternalId.set(row.internalId, row);
  }

  for (const internalId of params.internalIds) {
    const row = byInternalId.get(internalId);
    if (!row) {
      output.set(internalId, {
        status: 'unmapped',
        reason: `no ${params.provider} mapping for ${params.entityType} ${internalId}`,
      });
      continue;
    }

    const entity: ResolvedEntity = {
      internalId: row.internalId,
      providerId: row.providerId,
      confidence: row.confidence,
      verified: row.verifiedBy !== null,
    };

    output.set(
      internalId,
      entity.verified
        ? { status: 'resolved', entity }
        : {
            status: 'unverified',
            entity,
            reason: `mapping for ${params.entityType} ${internalId} is auto-matched and unverified`,
          },
    );
  }

  return output;
}

// ── Candidate proposal (for human review, never for live lookup) ─────────────

export function normalizeEntityName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    // Re-join single-letter runs so punctuated abbreviations survive the strip
    // above: "F.C." becomes "f c" here, which would otherwise never match the
    // "fc" suffix rule below. Also correctly folds "W B A" to "wba".
    .replace(/\b([a-z])\s+(?=[a-z]\b)/g, '$1')
    .replace(/\b(fc|cf|sc|afc|ac|the|club|football|team)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokens too common to identify a club on their own. A single shared "united"
 * or "city" is not evidence of a match.
 */
const GENERIC_TOKENS = new Set([
  'united', 'city', 'town', 'rovers', 'wanderers', 'athletic', 'atletico',
  'real', 'sporting', 'racing', 'olympique', 'inter', 'stars', 'rangers',
  'albion', 'county', 'sport', 'clube', 'deportivo',
]);

/** Confidence bands. Anything below AUTO is proposed but explicitly uncertain. */
export const SINGLE_TOKEN_CONTAINMENT = 0.75;
export const MULTI_TOKEN_CONTAINMENT = 0.9;

export interface SimilarityResult {
  score: number;
  /**
   * True when the score rests on a SINGLE shared token. Club names are often
   * city names, so one token is weak evidence and the proposal needs a human.
   */
  ambiguous: boolean;
}

/**
 * Name similarity in [0,1], with an ambiguity flag.
 *
 * Plain token overlap divides by the LONGER name, which punishes legitimate
 * matches where one source is verbose: "Brighton & Hove Albion FC" vs
 * "Brighton" scored 0.33 and was rejected.
 *
 * Full containment therefore earns credit — but the amount depends on how much
 * evidence it rests on:
 *
 *   multi-token  ("Hull City" ⊂ "Hull City AFC")      -> 0.90, unambiguous
 *   single-token ("Brighton"  ⊂ "Brighton & Hove …")  -> 0.75, AMBIGUOUS
 *
 * The single-token case is capped and flagged because a lone shared token is
 * frequently a city rather than a club: "Paris" ⊂ "Paris Saint Germain" scored
 * 0.90 against our "Paris FC", and "Barcelona" ⊂ "RCD Espanyol de Barcelona"
 * did the same. Both were wrong, and both were caught only because the correct
 * club also happened to be present and scored higher.
 */
export function similarityDetail(a: string, b: string): SimilarityResult {
  const left = new Set(normalizeEntityName(a).split(' ').filter(Boolean));
  const right = new Set(normalizeEntityName(b).split(' ').filter(Boolean));
  if (left.size === 0 || right.size === 0) return { score: 0, ambiguous: false };

  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;

  const overlap = shared / Math.max(left.size, right.size);
  if (left.size === right.size && shared === left.size) return { score: 1, ambiguous: false };

  const [shorter, longer] = left.size <= right.size ? [left, right] : [right, left];
  const contained = shared === shorter.size;
  if (!contained || longer.size <= shorter.size) return { score: overlap, ambiguous: false };

  if (shorter.size >= 2) return { score: Math.max(overlap, MULTI_TOKEN_CONTAINMENT), ambiguous: false };

  const token = [...shorter][0];
  const identifying = token !== undefined && token.length >= 5 && !GENERIC_TOKENS.has(token);
  if (!identifying) return { score: overlap, ambiguous: false };

  return { score: Math.max(overlap, SINGLE_TOKEN_CONTAINMENT), ambiguous: true };
}

/** Backwards-compatible scalar form. */
export function nameSimilarity(a: string, b: string): number {
  return similarityDetail(a, b).score;
}

export interface MappingCandidate {
  internalId: string;
  providerId: string;
  providerName: string;
  internalName: string;
  confidence: number;
  /** Rests on a single shared token — a reviewer must confirm this one. */
  ambiguous: boolean;
}

/** Two provider entities competing for the same internal entity. */
export interface MappingConflict {
  internalId: string;
  internalName: string;
  /** The proposal that won, by confidence. */
  accepted: MappingCandidate;
  /** Proposals rejected because the internal entity was already claimed. */
  rejected: MappingCandidate[];
}

export interface MappingProposal {
  candidates: MappingCandidate[];
  conflicts: MappingConflict[];
}

/**
 * Proposes mappings for human review.
 *
 * Output is written with `verifiedBy: null`, which resolution treats as
 * unusable. A person confirms them before any of it reaches the model.
 */
export function proposeMappings(
  internal: Array<{ id: string; name: string; aliases?: string[] }>,
  providerEntities: Array<{ id: string; name: string }>,
  minimumConfidence = 0.6,
): MappingCandidate[] {
  return proposeMappingsDetailed(internal, providerEntities, minimumConfidence).candidates;
}

/**
 * Proposes ONE-TO-ONE mappings, plus the conflicts that were rejected.
 *
 * Without an injectivity constraint two provider teams can both claim the same
 * internal team — which produced a 107% "coverage" figure and would have
 * written ambiguous rows that `resolveProviderId` resolves arbitrarily.
 *
 * Assignment is greedy by confidence: the strongest proposal wins the internal
 * entity, and weaker claims on the same entity are surfaced as conflicts for
 * human review rather than silently dropped.
 */
export function proposeMappingsDetailed(
  internal: Array<{ id: string; name: string; aliases?: string[] }>,
  providerEntities: Array<{ id: string; name: string }>,
  minimumConfidence = 0.6,
): MappingProposal {
  const proposals: MappingCandidate[] = [];

  for (const providerEntity of providerEntities) {
    let best: MappingCandidate | undefined;

    for (const entity of internal) {
      const names = [entity.name, ...(entity.aliases ?? [])];
      const scored = names
        .map((name) => similarityDetail(name, providerEntity.name))
        .reduce((bestScore, candidate) => (candidate.score > bestScore.score ? candidate : bestScore));

      if (scored.score >= minimumConfidence && (!best || scored.score > best.confidence)) {
        best = {
          internalId: entity.id,
          providerId: providerEntity.id,
          providerName: providerEntity.name,
          internalName: entity.name,
          confidence: scored.score,
          ambiguous: scored.ambiguous,
        };
      }
    }

    if (best) proposals.push(best);
  }

  // Greedy one-to-one assignment, strongest first.
  const sorted = [...proposals].sort((a, b) => b.confidence - a.confidence);
  const claimedInternal = new Map<string, MappingCandidate>();
  const claimedProvider = new Set<string>();
  const candidates: MappingCandidate[] = [];
  const rejectedByInternal = new Map<string, MappingCandidate[]>();

  for (const proposal of sorted) {
    if (claimedProvider.has(proposal.providerId)) continue;

    const holder = claimedInternal.get(proposal.internalId);
    if (holder) {
      const existing = rejectedByInternal.get(proposal.internalId) ?? [];
      existing.push(proposal);
      rejectedByInternal.set(proposal.internalId, existing);
      continue;
    }

    claimedInternal.set(proposal.internalId, proposal);
    claimedProvider.add(proposal.providerId);
    candidates.push(proposal);
  }

  const conflicts: MappingConflict[] = [];
  for (const [internalId, rejected] of rejectedByInternal) {
    const accepted = claimedInternal.get(internalId);
    if (!accepted) continue;
    conflicts.push({ internalId, internalName: accepted.internalName, accepted, rejected });
  }

  return { candidates, conflicts };
}
