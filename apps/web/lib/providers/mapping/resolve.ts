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

/** Token-overlap similarity in [0,1]. Deliberately simple and explainable. */
export function nameSimilarity(a: string, b: string): number {
  const left = new Set(normalizeEntityName(a).split(' ').filter(Boolean));
  const right = new Set(normalizeEntityName(b).split(' ').filter(Boolean));
  if (left.size === 0 || right.size === 0) return 0;

  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;

  return shared / Math.max(left.size, right.size);
}

export interface MappingCandidate {
  internalId: string;
  providerId: string;
  providerName: string;
  internalName: string;
  confidence: number;
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
  const candidates: MappingCandidate[] = [];

  for (const providerEntity of providerEntities) {
    let best: MappingCandidate | undefined;

    for (const entity of internal) {
      const names = [entity.name, ...(entity.aliases ?? [])];
      const confidence = Math.max(...names.map((name) => nameSimilarity(name, providerEntity.name)));

      if (confidence >= minimumConfidence && (!best || confidence > best.confidence)) {
        best = {
          internalId: entity.id,
          providerId: providerEntity.id,
          providerName: providerEntity.name,
          internalName: entity.name,
          confidence,
        };
      }
    }

    if (best) candidates.push(best);
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}
