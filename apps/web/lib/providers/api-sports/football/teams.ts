import type { ApiSportsClient } from '../client';

interface ApiSportsTeamResponse {
  team: { id: number; name: string; code: string | null; country: string; founded: number | null; national: boolean };
  venue: { id: number | null; name: string | null; city: string | null; capacity: number | null };
}

export interface ApiSportsTeam {
  id: number;
  name: string;
  code: string | null;
  country: string;
  venueName: string | null;
  venueCity: string | null;
}

/**
 * All teams in a league season.
 *
 * Used to seed `ProviderEntityMap`. The returned names go through the mapping
 * proposal path, never straight into a lookup — see `providers/mapping/resolve`.
 */
export async function fetchTeams(
  client: ApiSportsClient,
  params: { league: number; season: number },
): Promise<ApiSportsTeam[]> {
  const raw = await client.get<ApiSportsTeamResponse>('teams', {
    league: params.league,
    season: params.season,
  });

  return raw.map((entry) => ({
    id: entry.team.id,
    name: entry.team.name,
    code: entry.team.code,
    country: entry.team.country,
    venueName: entry.venue?.name ?? null,
    venueCity: entry.venue?.city ?? null,
  }));
}
