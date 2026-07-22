# Premium Prediction Data Feeds

Date: 2026-06-25

The app is wired so data feeds can be enabled by environment variables without changing the prediction UI contract.

## Live Today Without Paid Keys

- Daily fixture sync still runs from Football-Data.
- Predictions still run through the LangGraph orchestration with the deterministic fallback.
- `FixtureEnrichment` records weather, injury, lineup, referee, goals, and cards slots.
- Weather uses Open-Meteo only when venue coordinates are configured.
- Provider gaps are stored as unavailable markers instead of guessed data.

## Environment Variables

### Odds

- `THE_ODDS_API_KEY`: enables The Odds API.
- `THE_ODDS_API_REGIONS`: optional, defaults to `us,uk,eu`.
- `THE_ODDS_API_MARKETS`: optional, defaults to `h2h`.
- `THE_ODDS_API_FORMAT`: optional, defaults to `decimal`.
- `ODDS_MOVEMENT_ALERT_THRESHOLD`: optional, defaults to `0.02`.

When enabled, cron fetches competition-level odds, matches provider events to fixtures by team names, stores bookmaker prices, detects movement, and queues premium alerts.

### Weather

- `VENUE_COORDINATES_JSON`: optional JSON object keyed by fixture id, home team name, or away team name.

Example:

```json
{
  "537349": { "label": "MetLife Stadium", "latitude": 40.8135, "longitude": -74.0745 },
  "Nigeria": { "label": "Abuja National Stadium", "latitude": 9.0410, "longitude": 7.4536 }
}
```

When coordinates exist, Open-Meteo weather is pulled for kickoff day and stored in `FixtureEnrichment.weatherJson`.

## Paid Feed Slots

The schema and UI are ready for:

- Sportmonks injuries, suspensions, official lineups, expected lineups.
- StatsBomb or Opta event/xG data.
- Referee and card history feeds.
- Odds history and closing-line benchmarks.

## Alert Records

Cron writes `PredictionAlert` records for:

- `VALUE_BET`
- `ODDS_MOVEMENT`

Dispatch is intentionally separate. Email, Telegram, WhatsApp, and in-app delivery can consume queued alerts after provider quality and subscription entitlements are finalized.
