import type { Match, OddsByBook } from '@apexpredix/types';

const DEFAULT_MODEL = { elo: 0.5, poisson: 0.5, xg: 0.5, ensemble: 0.5, confidence: 0.55 };

interface FixtureRow {
  externalId: number;
  competitionId: string;
  competition?: { name: string } | null;
  homeTeam: { name: string; tla?: string | null; shortName?: string | null };
  awayTeam: { name: string; tla?: string | null; shortName?: string | null };
  kickoff: Date;
  odds?: Array<{ bookCode: string; market: string; price: number }>;
  predictions?: Array<{
    elo: number;
    poisson: number;
    xg: number;
    ensemble: number;
    confidence: number;
    topPick: string;
    valueBet: boolean;
    narrative: string;
  }>;
}

function teamCode(team: { tla?: string | null; shortName?: string | null; name: string }) {
  return (team.tla ?? team.shortName ?? team.name.slice(0, 3)).toUpperCase();
}

function oddsMarket(market: string): OddsByBook['market'] {
  const allowed = new Set(['1', 'X', '2', 'O2.5', 'U2.5', 'BTTS-Y', 'BTTS-N']);
  return allowed.has(market) ? (market as OddsByBook['market']) : '1';
}

export function normalizeFixture(row: FixtureRow, index = 0): Match {
  const prediction = row.predictions?.[0];
  const model = prediction
    ? {
        elo: prediction.elo,
        poisson: prediction.poisson,
        xg: prediction.xg,
        ensemble: prediction.ensemble,
        confidence: prediction.confidence,
      }
    : DEFAULT_MODEL;

  const odds: OddsByBook[] = (row.odds?.length ? row.odds : [{ bookCode: 'PN', market: '1', price: 1.9 }]).map(
    (odd) => ({
      bookCode: odd.bookCode,
      market: oddsMarket(odd.market),
      price: odd.price,
    }),
  );

  return {
    id: `live-${row.externalId}`,
    sport: 'soccer',
    league: row.competition?.name ?? row.competitionId,
    home: { name: row.homeTeam.name, code: teamCode(row.homeTeam) },
    away: { name: row.awayTeam.name, code: teamCode(row.awayTeam) },
    kickoff: row.kickoff.toISOString(),
    odds,
    model,
    topPick: prediction?.topPick ?? `${teamCode(row.homeTeam)} Win`,
    valueBet: prediction?.valueBet ?? false,
    narrative:
      prediction?.narrative ??
      'Live fixture synced from the provider. The prediction engine will add a fresh model narrative on the next scheduled run.',
    featured: index < 6,
  };
}
