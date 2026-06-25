# ApexPredix CrewAI Research Service

This service is a Python-side research scaffold for model and data-quality agents. It is intentionally outside the Next.js/Vercel runtime.

## Purpose

- Review weather, injury, referee, card, odds, and shot-event providers.
- Run offline feature-quality and backtest investigations.
- Produce recommended model changes for the deterministic LangGraph cron.

## Setup

```bash
cd services/crewai-research
uv sync
cp .env.example .env
```

Required provider keys should stay in the local `.env` or the deployment secret store. Do not commit real keys.

## Agents

Agent and task definitions live under `config/`. The first production use should be a read-only vendor freshness report before any generated model output is allowed into the web app.
