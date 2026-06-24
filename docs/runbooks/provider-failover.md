# Provider Failover Runbook

## Scope

Fixture refresh uses `withFailover('fixtures', primary, secondary)` from `apps/web/lib/providers/failover.ts`.

## Switch Behavior

1. Primary provider is used by default.
2. Three consecutive primary failures with a 4xx, 5xx, or network-style error switch traffic to secondary.
3. The switch is written to in-memory state and Upstash Redis at `provider:health:fixtures`.
4. A Sentry warning is emitted whenever the active provider changes.

## Cooldown

After switching to secondary, the worker waits 30 minutes before retrying primary. If primary succeeds, state resets. If it fails again, secondary remains active for another cooldown window.

## Manual Force-Back

Use Redis tooling to delete the state key:

```sh
redis-cli DEL provider:health:fixtures
```

The next worker run will retry primary.

## Alerts

Monitor Sentry warnings tagged:

- `area=provider.failover`
- `provider=fixtures`

Investigate provider credentials, quota, and upstream outage notices before forcing traffic back.
