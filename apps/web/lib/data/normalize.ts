import type { Match, MatchContextStatus, OddsByBook, PerformanceContext } from '@apexpredix/types';

const DEFAULT_MODEL = { elo: 0.5, poisson: 0.5, xg: 0.5, ensemble: 0.5, confidence: 0.55 };

interface FixtureRow {
  externalId: number;
  competitionId: string;
  competition?: { name: string } | null;
  homeTeam: { name: string; tla?: string | null; shortName?: string | null };
  awayTeam: { name: string; tla?: string | null; shortName?: string | null };
  kickoff: Date;
  odds?: Array<{ bookCode: string; market: string; price: number }>;
  oddsMovements?: Array<{
    bookCode: string;
    market: string;
    previousPrice: number;
    currentPrice: number;
    movementPct: number;
    capturedAt: Date;
  }>;
  enrichment?: {
    weatherJson?: unknown;
    injuriesJson?: unknown;
    lineupsJson?: unknown;
    refereeJson?: unknown;
  } | null;
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asBool(value: unknown) {
  return typeof value === 'boolean' ? value : false;
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function unavailableSummary(kind: string, reason?: string) {
  if (reason === 'venue-coordinates-not-configured') return 'Ready for Open-Meteo once venue coordinates are configured.';
  if (reason?.includes('provider-not-configured')) return `Ready for ${kind} feed once the provider key is configured.`;
  return `${kind} context pending provider data.`;
}

function weatherStatus(value: unknown): MatchContextStatus {
  const weather = asRecord(value);
  const available = asBool(weather.available);
  const provider = asString(weather.provider);
  const reason = asString(weather.reason);
  if (!available) {
    return {
      available,
      ...(provider ? { provider } : {}),
      ...(reason ? { reason } : {}),
      summary: unavailableSummary('weather', reason),
    };
  }

  const temp = asNumber(weather.temperatureC);
  const wind = asNumber(weather.windKph);
  const rain = asNumber(weather.precipitationMm);
  return {
    available,
    ...(provider ? { provider } : {}),
    summary: `Forecast: ${temp?.toFixed(1) ?? '—'}C, ${wind?.toFixed(0) ?? '—'} kph wind, ${rain?.toFixed(1) ?? '0.0'} mm precipitation.`,
  };
}

function genericStatus(kind: string, value: unknown): MatchContextStatus {
  const data = asRecord(value);
  const available = asBool(data.available);
  const provider = asString(data.provider);
  const reason = asString(data.reason);
  return {
    available,
    ...(provider ? { provider } : {}),
    ...(reason ? { reason } : {}),
    summary: available ? `${kind} feed active and included in review.` : unavailableSummary(kind, reason),
  };
}

export function normalizeFixture(row: FixtureRow, index = 0, performance?: PerformanceContext): Match {
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
    premiumContext: {
      weather: weatherStatus(row.enrichment?.weatherJson),
      injuries: genericStatus('injury', row.enrichment?.injuriesJson),
      lineups: genericStatus('lineup', row.enrichment?.lineupsJson),
      referee: genericStatus('referee', row.enrichment?.refereeJson),
      oddsMovement: (row.oddsMovements ?? []).map((movement) => ({
        bookCode: movement.bookCode,
        market: oddsMarket(movement.market),
        previousPrice: movement.previousPrice,
        currentPrice: movement.currentPrice,
        movementPct: movement.movementPct,
        capturedAt: movement.capturedAt.toISOString(),
      })),
      ...(performance ? { performance } : {}),
    },
    featured: index < 6,
  };
}
