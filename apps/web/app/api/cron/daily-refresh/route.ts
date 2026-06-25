import { NextResponse } from 'next/server';
import { prisma } from '@apexpredix/db';
import agents from '@/data/agents.json';
import type { AgentJSON } from '@/data/agents.schema';
import { requireCronAuth } from '@/lib/cron-auth';
import { configuredCompetitions, type FootballDataStandingRow, type FootballDataTeam } from '@/lib/live-data/football-data';
import { generatePrediction } from '@/lib/prediction-engine/model';
import { runBacktest } from '@/lib/prediction-engine/backtest';
import { FootballDataProvider, SportmonksProvider } from '@/lib/providers/fixtures/football-data-provider';
import { runWorker, runWorkerWithFailover } from '@/lib/workers/runWorker';
import { writeHeartbeat } from '@/lib/workers/heartbeat';

export const runtime = 'nodejs';
export const maxDuration = 300;
const primaryFixturesProvider = new FootballDataProvider();
const secondaryFixturesProvider = new SportmonksProvider();

// Per-agent status write, routed through the shared worker module.
const heartbeat = (agentId: string, status: string, message: string, started: number) =>
  writeHeartbeat(agentId, status, message, Date.now() - started);

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
    let evaluatedNow = 0;
    const competitionErrors: string[] = [];

    for (const code of configuredCompetitions()) {
      try {
        const bundle = await runWorkerWithFailover(
          'fixtures',
          () => primaryFixturesProvider.fetchCompetitionBundle(code),
          () => secondaryFixturesProvider.fetchCompetitionBundle(code),
        );
        const competition = bundle.competition;
        const standings = statsByTeam(bundle.standings);
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

          const prediction = generatePrediction({
            match,
            homeStats: standings.get(match.homeTeam.id),
            awayStats: standings.get(match.awayTeam.id),
          });

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
            },
          });
          predictionsWritten += 1;

          // Never persist synthetic model prices — only real bookmaker odds.
          const realOdds = prediction.odds.filter(
            (odd) => odd.bookCode !== 'MODEL_FAIR_PRICE' && odd.bookCode !== 'MODEL',
          );
          await prisma.odds.deleteMany({ where: { fixtureId: fixture.id } });
          if (realOdds.length > 0) {
            await prisma.odds.createMany({ data: realOdds.map((odd) => ({ ...odd, fixtureId: fixture.id })) });
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

    const backtest = await runBacktest(prisma, { windowDays: 90, stake: 10 });
    evaluatedNow = backtest.evaluatedNow;

    await Promise.all([
      heartbeat('fixture-sync', 'live', `${fixturesWritten} fixtures upserted`, started),
      heartbeat('team-stats', 'live', `${statsWritten} team-stat rows captured`, started),
      heartbeat('prediction-engine', 'live', `${predictionsWritten} prediction snapshots generated`, started),
      heartbeat('settlement', 'live', `${resultsWritten} results settled`, started),
      heartbeat('backtest', 'live', `${evaluatedNow} predictions evaluated; ${backtest.run.sampleSize} in 90d window`, started),
      ...(agents as AgentJSON[])
        .filter((agent) => !['fixture-sync', 'team-stats', 'settlement', 'backtest'].includes(agent.id))
        .map((agent) => heartbeat(agent.id, agent.status, `${agent.name} daily refresh tick`, started)),
    ]);

    return { fixturesWritten, predictionsWritten, resultsWritten, statsWritten, evaluatedNow, competitionErrors };
  }, { message: (r) => `${r.fixturesWritten} fixtures, ${r.predictionsWritten} predictions, ${r.evaluatedNow} evaluated` });

  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.message, errorClass: outcome.errorClass }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...outcome.result });
}
