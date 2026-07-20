# Agentic Prediction Orchestration

Date: 2026-06-25

## Current State

The production app previously exposed agent identities in `apps/web/data/agents.json`, but the actual prediction work ran through one deterministic function in `apps/web/lib/prediction-engine/model.ts`. That function blended table position, points pace, goal difference, a home edge, and optional market odds into a 1X2 prediction.

This change keeps that fallback intact and adds a typed LangGraph orchestration layer in `apps/web/lib/prediction-engine/orchestrator.ts`.

## Live Workflow

The cron route now uses a deterministic graph:

1. `context-agent`: builds team-strength and candidate market context.
2. `market-agent`: identifies the best 1X2 value/probability side.
3. `elo-agent`: converts team-strength spread into an ELO-style signal.
4. `poisson-agent`: estimates scoreline-derived 1X2 probabilities from expected goals.
5. `xg-agent`: keeps the existing xG proxy in the ensemble.
6. `ensemble-agent`: produces the existing `PredictionSnapshot` shape.

The old `generatePrediction()` remains available and cron falls back to it if the graph throws.

## Enrichment Data

`FixtureEnrichment` stores the match-day inputs that should eventually feed the model:

- `weatherJson`: weather provider payload or unavailable marker.
- `injuriesJson`: injury/lineup provider payload or unavailable marker.
- `refereeJson`: referee/card profile payload or unavailable marker.
- `goalsJson`: expected home/away goals baseline.
- `cardsJson`: expected-card baseline.

The current enrichment implementation records unavailable weather, injury, and referee feeds explicitly. It does not fabricate those signals.

## Research Basis

The Poisson branch follows the common football modeling pattern of estimating home and away goal rates, then deriving outcome probabilities from scoreline distributions. Current literature still treats Poisson goal modeling as a common baseline, while noting known limitations such as underestimating 0-0 and other low-score structures. The next modeling iteration should evaluate Dixon-Coles or zero-inflated variants against the existing backtest tables.

For xG, the app should move from the current team-stat proxy to shot-event features when a data vendor is available. Recent interpretable xG work uses shot context variables and hierarchical effects for players/teams, which is the correct direction once ApexPredix has event-level data.

## CrewAI Role

CrewAI is not placed inside the Vercel request path. It is Python-first and better suited here as an offline research and enrichment service that can:

- compare data vendors,
- audit injury/weather/card feed freshness,
- generate feature-quality reports,
- run backtest experiments,
- prepare candidate model configs for the deterministic web cron.

The scaffold lives in `services/crewai-research` and should run outside Vercel.

## Accuracy Roadmap

1. Connect real vendor feeds for weather, injuries, referee/card history, odds movement, and shot-event xG.
2. Populate `FixtureEnrichment` with provider payloads and source timestamps.
3. Add historical feature vectors under `packages/ml/features` or a separate training service.
4. Evaluate with Brier score, log loss, calibration error, ROI, closing-line value, and bookmaker baseline deltas.
5. Promote only calibrated models to the Vercel cron, keeping the current heuristic as fallback.

## Sources

- LangGraph JS docs: https://docs.langchain.com/oss/javascript/langgraph/quickstart
- LangGraph Graph API docs: https://docs.langchain.com/oss/javascript/langgraph/graph-api
- CrewAI docs: https://docs.crewai.com/
- Poisson football prediction research: https://www.mdpi.com/2076-3417/14/16/7230
- Interpretable xG research: https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1504362/full
