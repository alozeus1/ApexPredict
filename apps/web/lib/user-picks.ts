import { prisma } from '@apexpredix/db';

export type PickResultValue = 'WIN' | 'LOSS' | 'VOID' | 'PENDING';

export interface PickLike {
  result: PickResultValue;
  stake: number;
  price: number | null;
}

export interface PickSummary {
  total: number;
  pending: number;
  settled: number; // WIN | LOSS | VOID
  wins: number;
  losses: number;
  voids: number;
  /** wins / (wins + losses); null when there are no decided picks yet. */
  hitRate: number | null;
}

/** Pure summary over a user's picks. Settled excludes PENDING; hitRate ignores VOID. */
export function summarizePicks(picks: PickLike[]): PickSummary {
  let pending = 0;
  let wins = 0;
  let losses = 0;
  let voids = 0;
  for (const p of picks) {
    if (p.result === 'PENDING') pending += 1;
    else if (p.result === 'WIN') wins += 1;
    else if (p.result === 'LOSS') losses += 1;
    else if (p.result === 'VOID') voids += 1;
  }
  const decided = wins + losses;
  return {
    total: picks.length,
    pending,
    settled: wins + losses + voids,
    wins,
    losses,
    voids,
    hitRate: decided > 0 ? wins / decided : null,
  };
}

/** Most recent picks for a user (newest first). */
export function listRecentPicks(userId: string, limit = 50) {
  return prisma.userPick.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/** Fetch a user's picks and summarize them. */
export async function getPickSummary(userId: string): Promise<PickSummary> {
  const picks = await prisma.userPick.findMany({
    where: { userId },
    select: { result: true, stake: true, price: true },
  });
  return summarizePicks(picks as PickLike[]);
}
