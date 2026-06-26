import type { FootballDataMatch } from '@/lib/live-data/football-data';
import { resolveVenueCoordinates } from './venue-coordinates';

export interface WeatherContext {
  available: boolean;
  provider: string;
  reason?: string;
  venue?: string;
  temperatureC?: number;
  windKph?: number;
  precipitationMm?: number;
  capturedAt?: string;
}

interface OpenMeteoResponse {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    wind_speed_10m?: number[];
    precipitation?: number[];
  };
}

function nearestIndex(times: string[] | undefined, kickoffIso: string) {
  if (!times?.length) return -1;
  const kickoff = new Date(kickoffIso).getTime();
  let best = 0;
  let bestDistance = Infinity;
  times.forEach((time, index) => {
    const distance = Math.abs(new Date(time).getTime() - kickoff);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

function openMeteoUrl(match: FootballDataMatch, latitude: number, longitude: number) {
  const date = match.utcDate.slice(0, 10);
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: 'temperature_2m,wind_speed_10m,precipitation',
    start_date: date,
    end_date: date,
    timezone: 'UTC',
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export async function fetchOpenMeteoWeather(match: FootballDataMatch): Promise<WeatherContext> {
  const venue = resolveVenueCoordinates(match);
  if (!venue) {
    return {
      available: false,
      provider: 'open-meteo',
      reason: 'venue-coordinates-not-configured',
    };
  }

  const response = await fetch(openMeteoUrl(match, venue.latitude, venue.longitude), { cache: 'no-store' });
  if (!response.ok) {
    return {
      available: false,
      provider: 'open-meteo',
      reason: `open-meteo-${response.status}`,
      venue: venue.label,
    };
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const index = nearestIndex(data.hourly?.time, match.utcDate);
  if (index < 0) {
    return {
      available: false,
      provider: 'open-meteo',
      reason: 'forecast-hour-not-found',
      venue: venue.label,
    };
  }

  return {
    available: true,
    provider: 'open-meteo',
    venue: venue.label,
    ...(data.hourly?.temperature_2m?.[index] != null ? { temperatureC: data.hourly.temperature_2m[index] } : {}),
    ...(data.hourly?.wind_speed_10m?.[index] != null ? { windKph: data.hourly.wind_speed_10m[index] } : {}),
    ...(data.hourly?.precipitation?.[index] != null ? { precipitationMm: data.hourly.precipitation[index] } : {}),
    capturedAt: new Date().toISOString(),
  };
}
