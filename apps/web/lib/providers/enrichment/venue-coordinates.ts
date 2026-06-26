import type { FootballDataMatch } from '@/lib/live-data/football-data';

export interface VenueCoordinates {
  label: string;
  latitude: number;
  longitude: number;
}

function validCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseConfiguredCoordinates(): Record<string, VenueCoordinates> {
  const raw = process.env.VENUE_COORDINATES_JSON;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([key, value]) => {
        if (!value || typeof value !== 'object') return [];
        const item = value as Record<string, unknown>;
        const latitude = item.latitude;
        const longitude = item.longitude;
        if (!validCoordinate(latitude) || !validCoordinate(longitude)) return [];
        return [[
          key,
          {
            label: typeof item.label === 'string' ? item.label : key,
            latitude,
            longitude,
          },
        ]];
      }),
    );
  } catch {
    return {};
  }
}

export function resolveVenueCoordinates(match: FootballDataMatch): VenueCoordinates | undefined {
  const configured = parseConfiguredCoordinates();
  return configured[String(match.id)] ?? configured[match.homeTeam.name] ?? configured[match.awayTeam.name];
}
