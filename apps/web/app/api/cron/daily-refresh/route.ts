import { NextResponse } from 'next/server';
import { prisma, type Prisma } from '@apexpredix/db';
import agents from '@/data/agents.json';
import type { AgentJSON } from '@/data/agents.schema';
import { requireCronAuth } from '@/lib/cron-auth';
import { configuredCompetitions, type FootballDataStandingRow, type FootballDataTeam } from '@/lib/live-data/football-data';
import { generatePrediction, teamStrength, recentFormScore } from '@/lib/prediction-engine/model';
import { buildFixtureEnrichment } from '@/lib/prediction-engine/enrichment';
import { runPredictionGraph } from '@/lib/prediction-engine/orchestrator';
import { persistMarketOdds, queueValueBetAlert } from '@/lib/prediction-engine/premium-signals';
import { runBacktest } from '@/lib/prediction-engine/backtest';
import { MATCH_1X2_FEATURE_SET } from '@/lib/features/spec';
import { ensureFeatureSet, persistVector } from '@/lib/features/store';
import { ensureProductionModel } from '@/lib/models/registry';
import { settleShadowScores } from '@/lib/models/shadow';
import { adaptiveEnsembleWeights } from '@/lib/prediction-engine/ensemble-weights';
import { runCalibrationHealth, runFeatureDrift } from '@/lib/monitoring/health';
import { shotsEnrichment } from '@/lib/prediction-engine/xg';
import { buildTeamShotProfiles } from '@/lib/prediction-engine/shot-profiles';
import { createApiSportsShotSource } from '@/lib/prediction-engine/shot-source';
import { ApiSportsClient } from '@/lib/providers/api-sports/client';
import { FootballDataProvider, SportmonksProvider } from '@/lib/providers/fixtures/football-data-provider';
import { TheOddsApiProvider } from '@/lib/providers/odds/the-odds-api';
import { runWorker, runWorkerWithFailover } from '@/lib/workers/runWorker';
import { writeHeartbeat } from '@/lib/workers/heartbeat';

export const runtime = 'nodejs';
export const maxDuration = 300;
const primaryFixturesProvider = new FootballDataProvider();
const secondaryFixturesProvider = new SportmonksProvider();
const oddsProvider = new TheOddsApiProvider();

// Per-agent status write, routed through the shared worker module.
const heartbeat = (agentId: string, status: string, message: string, started: number) =>
  writeHeartbeat(agentId, status, message, Date.now() - started);

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function statsByTeam(rows: FootballDataStandingRow[]) {
  return new Map(rows.map((row) => [row.team.id, row]));
}

function teamData(team: FootballDataTeam, competitionId: string) {
  return {
    externalId: team.id,
    name: team.name,
    shortName: team.shortName ?? null,
    tla: team.tla ?? null,
    crestUrl: team.crest ?? null,
    competitionId,
  };
}

function hasUsableTeam(team: FootballDataTeam) {
  return Number.isFinite(team.id) && Boolean(team.name);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown refresh error';
}

export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const started = Date.now();

  const outcome = await runWorker('daily-refresh', async () => {
    let fixturesWritten = 0;
    let predictionsWritten = 0;
    let resultsWritten = 0;
    let statsWritten = 0;
    let enrichmentsWritten = 0;
    let oddsWritten = 0;
    let movementsWritten = 0;
    let alertsQueued = 0;
    let evaluatedNow = 0;
    const competitionErrors: string[] = [];

    // One asOf for the whole run so every model-ops artifact (weights, feature
    // vectors, monitoring windows) shares a consistent clock.
    const asOf = new Date();

    // Resolve (bootstrapping on first run) the live model every snapshot is
    // attributed to, register the feature set, and compute adaptive ensemble
    // weights. All are defensively wrapped: a registry hiccup must not stop the
    // refresh, it just falls back to unattributed snapshots / equal weights.
    const productionModel = await ensureProductionModel(prisma, {
      family: 'ensemble',
      sport: 'FOOTBALL',
      name: 'ensemble',
      featureSetName: MATCH_1X2_FEATURE_SET.name,
      featureSetVersion: MATCH_1X2_FEATURE_SET.version,
    }).catch((error) => {
      competitionErrors.push(`model registry unavailable: ${errorMessage(error)}`);
      return null;
    });

    await ensureFeatureSet(prisma, MATCH_1X2_FEATURE_SET).catch((error) => {
      competitionErrors.push(`feature set registration failed: ${errorMessage(error)}`);
    });

    const adaptive = await adaptiveEnsembleWeights(prisma, { asOf }).catch(() => null);
    const ensembleWeights = adaptive?.weights;

    // Shot source for xG (gap #4). One instance per run so its call budget and
    // the API-Sports quota guard accumulate across every fixture. Null when
    // API-Sports is not configured — xG then stays honestly weight-0.
    const shotSource = createApiSportsShotSource(new ApiSportsClient({ sport: 'football' }));

    for (const code of configuredCompetitions()) {
      try {
        const bundle = await runWorkerWithFailover(
          'fixtures',
          () => primaryFixturesProvider.fetchCompetitionBundle(code),
          () => secondaryFixturesProvider.fetchCompetitionBundle(code),
        );
        const competition = bundle.competition;
        const standings = statsByTeam(bundle.standings);
        const oddsByMatch = await oddsProvider.fetchCompetitionOdds(code, bundle.matches).catch((error) => {
          competitionErrors.push(`${code}: odds provider skipped: ${errorMessage(error)}`);
          return new Map<number, Array<{ bookCode: string; market: string; price: number; source?: string }>>();
        });
        let skippedMatches = 0;
        let skippedStandings = 0;

        await prisma.competition.upsert({
          where: { id: competition.code ?? code },
          create: {
            id: competition.code ?? code,
            externalId: competition.id,
            name: competition.name,
            country: competition.area?.name ?? 'Unknown',
          },
          update: {
            externalId: competition.id,
            name: competition.name,
            country: competition.area?.name ?? 'Unknown',
          },
        });

        for (const row of bundle.standings) {
          if (!hasUsableTeam(row.team)) {
            skippedStandings += 1;
            continue;
          }

          const data = teamData(row.team, competition.code ?? code);
          const team = await prisma.team.upsert({
            where: { externalId: row.team.id },
            create: data,
            update: data,
          });

          await prisma.teamStat.create({
            data: {
              teamId: team.id,
              competitionId: competition.code ?? code,
              form: row.form ?? null,
              position: row.position,
              played: row.playedGames,
              won: row.won,
              drawn: row.draw,
              lost: row.lost,
              goalsFor: row.goalsFor,
              goalsAgainst: row.goalsAgainst,
              goalDifference: row.goalDifference,
              points: row.points,
            },
          });
          statsWritten += 1;
        }

        for (const match of bundle.matches) {
          if (!hasUsableTeam(match.homeTeam) || !hasUsableTeam(match.awayTeam)) {
            skippedMatches += 1;
            continue;
          }

          const [homeTeam, awayTeam] = await Promise.all([
            prisma.team.upsert({
              where: { externalId: match.homeTeam.id },
              create: teamData(match.homeTeam, competition.code ?? code),
              update: teamData(match.homeTeam, competition.code ?? code),
            }),
            prisma.team.upsert({
              where: { externalId: match.awayTeam.id },
              create: teamData(match.awayTeam, competition.code ?? code),
              update: teamData(match.awayTeam, competition.code ?? code),
            }),
          ]);

          const fixture = await prisma.fixture.upsert({
            where: { externalId: match.id },
            create: {
              externalId: match.id,
              competitionId: competition.code ?? code,
              homeTeamId: homeTeam.id,
              awayTeamId: awayTeam.id,
              kickoff: new Date(match.utcDate),
              status: match.status,
              matchday: match.matchday ?? null,
            },
            update: {
              competitionId: competition.code ?? code,
              homeTeamId: homeTeam.id,
              awayTeamId: awayTeam.id,
              kickoff: new Date(match.utcDate),
              status: match.status,
              matchday: match.matchday ?? null,
            },
          });
          fixturesWritten += 1;

          const providerOdds = oddsByMatch.get(match.id) ?? [];
          const homeStats = standings.get(match.homeTeam.id);
          const awayStats = standings.get(match.awayTeam.id);
          const enrichment = await buildFixtureEnrichment(match, homeStats, awayStats);
          // Shots-based xG (gap #4): active once a shot-statistics feed populates
          // profiles. Until then this attaches an honest "unavailable" block and
          // the xg-agent stays at weight 0 rather than inventing a signal.
          const shotProfiles = await buildTeamShotProfiles(
            { prisma, source: shotSource },
            { homeExternalId: match.homeTeam.id, awayExternalId: match.awayTeam.id, asOf },
          ).catch(() => ({}) as { home?: undefined; away?: undefined });
          enrichment.shots = shotsEnrichment(shotProfiles.home, shotProfiles.away);

          const predictionInput = {
            match,
            homeStats,
            awayStats,
            marketOdds: providerOdds,
          };
          // Adaptive per-signal weights (gap #5) drive the ensemble; undefined
          // falls back to the fixed weights inside the graph.
          const graphResult = await runPredictionGraph(predictionInput, enrichment, ensembleWeights).catch((error) => {
            competitionErrors.push(`${code}: prediction graph fallback for match ${match.id}: ${errorMessage(error)}`);
            return undefined;
          });
          const prediction = graphResult?.prediction ?? generatePrediction(predictionInput);

          if (graphResult?.enrichment ?? enrichment) {
            const capturedEnrichment = graphResult?.enrichment ?? enrichment;
            await prisma.fixtureEnrichment.upsert({
              where: { fixtureId: fixture.id },
              create: {
                fixtureId: fixture.id,
                weatherJson: jsonValue(capturedEnrichment.weather),
                injuriesJson: jsonValue(capturedEnrichment.injuries),
                lineupsJson: jsonValue(capturedEnrichment.lineups),
                refereeJson: jsonValue(capturedEnrichment.referee),
                goalsJson: jsonValue(capturedEnrichment.goals),
                cardsJson: jsonValue(capturedEnrichment.cards),
                source: 'agentic-enrichment-v0',
              },
              update: {
                weatherJson: jsonValue(capturedEnrichment.weather),
                injuriesJson: jsonValue(capturedEnrichment.injuries),
                lineupsJson: jsonValue(capturedEnrichment.lineups),
                refereeJson: jsonValue(capturedEnrichment.referee),
                goalsJson: jsonValue(capturedEnrichment.goals),
                cardsJson: jsonValue(capturedEnrichment.cards),
                source: 'agentic-enrichment-v0',
                capturedAt: new Date(),
              },
            });
            enrichmentsWritten += 1;
          }

          // Persist the versioned feature vector (gap #6) from the same inputs the
          // engine scored, so training reads exactly what serving saw. Market and
          // rest-day features are left null until those extractors are wired; the
          // recorded completeness reflects that honestly.
          let featureVectorId: string | undefined;
          try {
            const fvEnrichment = graphResult?.enrichment ?? enrichment;
            const homeStrength = teamStrength(homeStats);
            const awayStrength = teamStrength(awayStats);
            const vector = await persistVector(prisma, fixture.id, MATCH_1X2_FEATURE_SET, {
              home_strength: homeStrength,
              away_strength: awayStrength,
              strength_spread: homeStrength - awayStrength,
              home_form: recentFormScore(homeStats?.form ?? undefined) ?? null,
              away_form: recentFormScore(awayStats?.form ?? undefined) ?? null,
              expected_home_goals: fvEnrichment.goals.expectedHomeGoals,
              expected_away_goals: fvEnrichment.goals.expectedAwayGoals,
              home_shots_xg: fvEnrichment.shots?.expectedHomeGoals ?? null,
              away_shots_xg: fvEnrichment.shots?.expectedAwayGoals ?? null,
              market_home_fair: null,
              market_draw_fair: null,
              market_away_fair: null,
              rest_days_home: null,
              rest_days_away: null,
            });
            featureVectorId = vector.id;
          } catch (error) {
            competitionErrors.push(`feature vector for match ${match.id}: ${errorMessage(error)}`);
          }

          await prisma.predictionSnapshot.create({
            data: {
              fixtureId: fixture.id,
              market: prediction.market,
              probability: prediction.probability,
              edge: prediction.edge,
              elo: prediction.elo,
              poisson: prediction.poisson,
              xg: prediction.xg,
              ensemble: prediction.ensemble,
              confidence: prediction.confidence,
              topPick: prediction.topPick,
              valueBet: prediction.valueBet,
              narrative: prediction.narrative,
              // Attribute the prediction to the live model and the exact feature
              // vector it was scored from (gaps #1/#6).
              ...(productionModel ? { modelVersionId: productionModel.id } : {}),
              ...(featureVectorId ? { featureVectorId } : {}),
            },
          });
          predictionsWritten += 1;

          if (providerOdds.length > 0) {
            const oddsResult = await persistMarketOdds(prisma, fixture.id, providerOdds);
            oddsWritten += oddsResult.oddsWritten;
            movementsWritten += oddsResult.movementsWritten;
            alertsQueued += oddsResult.movementAlertsQueued;
          }

          if (await queueValueBetAlert(prisma, fixture.id, prediction)) {
            alertsQueued += 1;
          }

          const homeScore = match.score?.fullTime?.home;
          const awayScore = match.score?.fullTime?.away;
          if (match.status === 'FINISHED' && homeScore != null && awayScore != null) {
            await prisma.fixtureResult.upsert({
              where: { fixtureId: fixture.id },
              create: {
                fixtureId: fixture.id,
                homeScore,
                awayScore,
                finishedAt: new Date(),
                raw: match as object,
              },
              update: { homeScore, awayScore, raw: match as object },
            });
            resultsWritten += 1;
          }
        }

        if (skippedMatches > 0 || skippedStandings > 0) {
          competitionErrors.push(
            `${code}: skipped ${skippedMatches} placeholder matches and ${skippedStandings} placeholder standings rows`,
          );
        }
      } catch (error) {
        const message = `${code}: ${errorMessage(error)}`;
        competitionErrors.push(message);
        await heartbeat('fixture-sync', 'error', message, started).catch(() => undefined);
      }
    }

    if (fixturesWritten === 0 && competitionErrors.length > 0) {
      throw new Error(`No competitions refreshed. ${competitionErrors.join(' | ')}`);
    }

    const backtest = await runBacktest(prisma, {
      windowDays: 90,
      stake: 10,
      ...(productionModel ? { modelVersionId: productionModel.id } : {}),
    });
    evaluatedNow = backtest.evaluatedNow;

    // Model-ops monitoring (gaps #2/#3): settle any shadow predictions whose
    // fixtures finished, then check calibration health and feature drift. All
    // additive and wrapped — a monitoring fault must never fail the refresh.
    const shadowSettled = await settleShadowScores(prisma, asOf).catch(() => ({ settled: 0, considered: 0 }));
    const calibrationHealth = await runCalibrationHealth(prisma, { asOf }).catch(() => null);
    const featureDrift = await runFeatureDrift(prisma, {
      featureSetName: MATCH_1X2_FEATURE_SET.name,
      featureSetVersion: MATCH_1X2_FEATURE_SET.version,
      asOf,
    }).catch(() => null);

    await Promise.all([
      heartbeat('fixture-sync', 'live', `${fixturesWritten} fixtures upserted`, started),
      heartbeat('odds-ingest', 'live', `${oddsWritten} odds prices captured`, started),
      heartbeat('team-stats', 'live', `${statsWritten} team-stat rows captured`, started),
      heartbeat('match-enrichment', 'live', `${enrichmentsWritten} fixture enrichments captured`, started),
      heartbeat('line-movement', 'live', `${movementsWritten} odds movements detected`, started),
      heartbeat('value-hunter', 'live', `${alertsQueued} premium alerts queued`, started),
      heartbeat('prediction-engine', 'live', `${predictionsWritten} prediction snapshots generated`, started),
      heartbeat('settlement', 'live', `${resultsWritten} results settled`, started),
      heartbeat('backtest', 'live', `${evaluatedNow} predictions evaluated; ${backtest.run.sampleSize} in 90d window`, started),
      heartbeat(
        'model-registry',
        'live',
        productionModel ? `serving ${productionModel.name}` : 'registry unavailable',
        started,
      ),
      heartbeat(
        'model-monitoring',
        'live',
        `${shadowSettled.settled} shadow settled; calibration ${calibrationHealth ? 'checked' : 'skipped'}; drift ${featureDrift?.judged ? 'checked' : 'insufficient'}`,
        started,
      ),
      ...(agents as AgentJSON[])
        .filter((agent) => !['fixture-sync', 'odds-ingest', 'team-stats', 'match-enrichment', 'line-movement', 'value-hunter', 'settlement', 'backtest'].includes(agent.id))
        .map((agent) => heartbeat(agent.id, agent.status, `${agent.name} daily refresh tick`, started)),
    ]);

    return {
      fixturesWritten,
      predictionsWritten,
      resultsWritten,
      statsWritten,
      enrichmentsWritten,
      oddsWritten,
      movementsWritten,
      alertsQueued,
      evaluatedNow,
      modelVersion: productionModel?.name ?? null,
      shadowSettled: shadowSettled.settled,
      weightsAdaptive: adaptive ? !adaptive.fellBackToUniform : false,
      competitionErrors,
    };
  }, { message: (r) => `${r.fixturesWritten} fixtures, ${r.predictionsWritten} predictions, ${r.evaluatedNow} evaluated` });

  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.message, errorClass: outcome.errorClass }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...outcome.result });
}
