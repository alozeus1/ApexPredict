import type { FootballDataCompetitionBundle } from '@/lib/live-data/football-data';

/** A normalized competition bundle (fixtures + standings + competition meta). */
export type CompetitionBundle = FootballDataCompetitionBundle;

/**
 * A source of fixtures + standings. Higher `priority` wins when multiple
 * providers cover the same competition (the S2 multi-provider cutover selects
 * the highest-priority provider that supports a competition).
 */
export interface FixturesProvider {
  readonly name: string;
  readonly priority: number;
  fetchCompetitionBundle(code: string, daysAhead?: number): Promise<CompetitionBundle>;
}
