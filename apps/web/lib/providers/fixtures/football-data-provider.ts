import {
  fetchCompetitionBundle as fetchFootballData,
  configuredCompetitions,
} from '@/lib/live-data/football-data';
import type { FixturesProvider, CompetitionBundle } from './types';

/** Football-Data.org — the live provider today. Wraps the existing fetcher. */
export class FootballDataProvider implements FixturesProvider {
  readonly name = 'football-data';
  readonly priority = 100;

  fetchCompetitionBundle(code: string, daysAhead = 14): Promise<CompetitionBundle> {
    return fetchFootballData(code, daysAhead);
  }

  /** Competitions this provider is configured to cover. */
  competitions(): string[] {
    return configuredCompetitions();
  }
}

/** Sportmonks — reserved. Wired in S2 alongside the multi-provider selection. */
export class SportmonksProvider implements FixturesProvider {
  readonly name = 'sportmonks';
  readonly priority = 90;

  fetchCompetitionBundle(_code: string, _daysAhead = 14): Promise<CompetitionBundle> {
    throw new Error('SportmonksProvider not implemented — wired in S2');
  }
}
