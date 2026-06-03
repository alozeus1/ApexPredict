import { NextResponse } from 'next/server';
import { prisma } from '@apexpredix/db';
import agents from '@/data/agents.json';
import type { AgentJSON } from '@/data/agents.schema';
import { requireCronAuth } from '@/lib/cron-auth';
import {
  configuredCompetitions,
  fetchCompetitionBundle,
  type FootballDataStandingRow,
  type FootballDataTeam,
} from '@/lib/live-data/football-data';
import { generatePrediction } from '@/lib/prediction-engine/model';
import { runBacktest } from '@/lib/prediction-engine/backtest';

export const runtime = 'nodejs';
export const maxDuration = 300;

async function heartbeat(agentId: string, status: string, message: string, started: number) {
  await prisma.agentHeartbeat.create({
    data: { agentId, status, message, durationMs: Date.now() - started },
  });
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

export async function GET(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const started = Date.now();
  let fixturesWritten = 0;
  let predictionsWritten = 0;
  let resultsWritten = 0;
  let statsWritten = 0;
  let evaluatedNow = 0;

  try {
    for (const code of configuredCompetitions()) {
      const bundle = await fetchCompetitionBundle(code);
      const competition = bundle.competition;
      const standings = statsByTeam(bundle.standings);

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

        await prisma.odds.deleteMany({ where: { fixtureId: fixture.id } });
        await prisma.odds.createMany({ data: prediction.odds.map((odd) => ({ ...odd, fixtureId: fixture.id })) });

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

    return NextResponse.json({ ok: true, fixturesWritten, predictionsWritten, resultsWritten, statsWritten, evaluatedNow });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown daily refresh error';
    await heartbeat('daily-refresh', 'error', message, started).catch(() => undefined);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
