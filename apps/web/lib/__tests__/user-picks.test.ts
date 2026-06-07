import { describe, it, expect } from 'vitest';
import { summarizePicks, type PickLike } from '../user-picks';

const pick = (result: PickLike['result']): PickLike => ({ result, stake: 10, price: 2 });

describe('summarizePicks', () => {
  it('returns a null hit rate with no decided picks', () => {
    const s = summarizePicks([pick('PENDING'), pick('PENDING')]);
    expect(s).toMatchObject({ total: 2, pending: 2, settled: 0, wins: 0, losses: 0, voids: 0, hitRate: null });
  });

  it('computes hit rate over decided (WIN+LOSS) picks, ignoring VOID and PENDING', () => {
    const s = summarizePicks([
      pick('WIN'), pick('WIN'), pick('WIN'),
      pick('LOSS'),
      pick('VOID'),
      pick('PENDING'),
    ]);
    expect(s.total).toBe(6);
    expect(s.wins).toBe(3);
    expect(s.losses).toBe(1);
    expect(s.voids).toBe(1);
    expect(s.pending).toBe(1);
    expect(s.settled).toBe(5); // wins + losses + voids
    expect(s.hitRate).toBeCloseTo(0.75); // 3 / (3 + 1)
  });

  it('handles an empty list', () => {
    expect(summarizePicks([])).toMatchObject({ total: 0, hitRate: null });
  });
});
